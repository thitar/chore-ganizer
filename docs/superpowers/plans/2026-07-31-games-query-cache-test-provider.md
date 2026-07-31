# Games Query Cache And Test Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop redundant Games eligibility refetches while making page tests exercise the real Query Client provider boundary.

**Architecture:** Keep the production `QueryClientProvider` at the application root and give `useGames()` a five-minute freshness window. Preserve immediate eligibility refresh through the existing `['games']` invalidation after chore completion. Remove the global hook mock and add explicit providers only to the page tests that currently render `AppShell` without one.

**Tech Stack:** React 18, TanStack Query, Vitest, React Testing Library, TypeScript.

---

### Task 1: Make Games Eligibility Cacheable

**Files:**
- Modify: `frontend/src/hooks/useGames.tsx`
- Modify: `frontend/src/__tests__/useGames.test.tsx`

- [ ] **Step 1: Change the existing hook test to assert the desired behavior**

Change the test name to `does not refetch when mounted again within the stale window` and change the final assertion to:

```tsx
await waitFor(() => expect(getGames).toHaveBeenCalledTimes(1))
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/__tests__/useGames.test.tsx`

Expected: FAIL because `useGames()` currently overrides the five-minute client default with `staleTime: 0`.

- [ ] **Step 3: Set the hook stale time to five minutes**

In `frontend/src/hooks/useGames.tsx`, replace `staleTime: 0` with:

```tsx
staleTime: 5 * 60 * 1000,
```

Leave `useSubmitPongScore()`'s `invalidateQueries({ queryKey: ['games'] })` unchanged so chore completion and score submission can still refresh the query immediately.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run src/__tests__/useGames.test.tsx`

Expected: the test passes with one `getGames` call across the two mounts.

### Task 2: Remove the Global Hook Mock From Page Tests

**Files:**
- Modify: `frontend/src/test/setup.ts`
- Modify: `frontend/src/__tests__/DashboardPage.test.tsx`
- Modify: `frontend/src/__tests__/TemplatesPage.test.tsx`

- [ ] **Step 1: Remove the global `vi.mock('../hooks/useGames')` block**

Delete the setup comment and mock from `frontend/src/test/setup.ts`; retain the Vitest matcher setup and `cleanup()` hook.

- [ ] **Step 2: Add a real Query Client provider to DashboardPage tests**

Import `QueryClient` and `QueryClientProvider` from `@tanstack/react-query`, create a fresh client inside `renderPage()`, and wrap the existing `MemoryRouter`:

```tsx
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

return render(
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  </QueryClientProvider>,
)
```

- [ ] **Step 3: Add the same provider boundary to TemplatesPage tests**

Import `QueryClient` and `QueryClientProvider`, create a fresh retry-disabled client in `renderPage()`, and wrap the existing `MemoryRouter` and `TemplatesPage` with it.

- [ ] **Step 4: Run the affected page tests and verify they pass**

Run: `npm test -- --run src/__tests__/DashboardPage.test.tsx src/__tests__/TemplatesPage.test.tsx`

Expected: both suites pass without relying on the global `useGames` mock.

### Task 3: Full Frontend Verification

**Files:**
- No additional files.

- [ ] **Step 1: Run the complete frontend test suite**

Run: `npm test`

Expected: all frontend test files pass.

- [ ] **Step 2: Run the frontend production build**

Run: `npm run build`

Expected: TypeScript compilation and Vite production build pass.
