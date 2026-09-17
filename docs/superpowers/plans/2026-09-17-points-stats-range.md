# Points Statistics Over a Period Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a parent see per-child earned points over an arbitrary date range (this week / this month / last 30 days / custom), building on `GET /api/points/weekly` as the seed.

**Architecture:** Add a new `GET /api/points/stats?from=&to=` endpoint alongside (not replacing) the existing `/weekly` route — `points.service.ts`'s `getWeeklyPoints()` stays untouched. The new `getPointsStats(fromStr?, toStr?)` service function generalizes the same `pointLog.groupBy` query with a parameterized date range, defaulting to the current week (same default as `/weekly`) when no range is given. Query-param validation follows the existing inline pattern in `backend/src/routes/assignments.routes.ts` (this codebase has no Zod query-schema convention — `validate()` only parses `req.body`). Frontend adds a small `PointsStats` card to `ParentDashboard` with period-preset buttons.

**Tech Stack:** Express + Prisma backend, Jest; React + TanStack Query frontend, Vitest.

## Global Constraints

- Bump `APP_VERSION` to `3.9.0` in `backend/package.json`, `frontend/package.json`, `.env`, `.env.example` per `docs/VERSION_MAP.md` — see Task 5.
- `GET /api/points/weekly` and `getWeeklyPoints()` must not change — this is an additive endpoint.
- The new route requires `authenticate` + `authorize('PARENT')`, matching `/weekly` and `/leaderboard`'s parent-only points views (per `docs/ARCHITECTURE.md`'s child-own-data rule; `/leaderboard` is the documented exception, not `/weekly` or this new route).
- Run backend tests with cwd `backend/`, frontend tests with cwd `frontend/` (see root `AGENTS.md`).

---

### Task 1: `getPointsStats` Service Function

**Files:**
- Modify: `backend/src/services/points.service.ts`
- Test: `backend/src/__tests__/services/points.service.test.ts`

**Interfaces:**
- Consumes: `startOfWeekUTC` — already imported in `points.service.ts` from `./gamification.service`.
- Produces: `getPointsStats(fromStr?: string, toStr?: string): Promise<{ from: string; to: string | null; entries: { user: { id: number; name: string; color: string; role: string }; points: number }[] }>` — this exact shape and function name is what Task 2 (route) and the frontend `PointsStatsResponse` type in Task 3 depend on.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/__tests__/services/points.service.test.ts`, in a new `describe` block after the existing `describe('pointsService.getWeeklyPoints', ...)` (or at the end of the file if no such block exists — check first; if `getWeeklyPoints` has no dedicated describe block, add this after the last existing `describe`):

```ts
describe('pointsService.getPointsStats', () => {
  const alice = { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }
  const bob = { id: 4, name: 'Bob', color: '#F59E0B', role: 'CHILD' }

  it('defaults to the current week when no range is given', async () => {
    prisma.user.findMany.mockResolvedValue([alice, bob])
    prisma.pointLog.groupBy.mockResolvedValue([{ userId: 3, _sum: { amount: 40 } }])

    const result = await pointsService.getPointsStats()

    expect(prisma.pointLog.groupBy).toHaveBeenCalledWith({
      by: ['userId'],
      where: { type: 'EARNED', createdAt: { gte: expect.any(Date) } },
      _sum: { amount: true },
    })
    expect(result.to).toBeNull()
    expect(result.entries).toEqual([
      { user: alice, points: 40 },
      { user: bob, points: 0 },
    ])
  })

  it('filters by an inclusive from/to date range and sorts descending', async () => {
    prisma.user.findMany.mockResolvedValue([alice, bob])
    prisma.pointLog.groupBy.mockResolvedValue([
      { userId: 3, _sum: { amount: 10 } },
      { userId: 4, _sum: { amount: 90 } },
    ])

    const result = await pointsService.getPointsStats('2026-08-01', '2026-08-31')

    expect(prisma.pointLog.groupBy).toHaveBeenCalledWith({
      by: ['userId'],
      where: {
        type: 'EARNED',
        createdAt: { gte: new Date('2026-08-01'), lt: new Date('2026-09-01T00:00:00.000Z') },
      },
      _sum: { amount: true },
    })
    expect(result.from).toBe(new Date('2026-08-01').toISOString())
    expect(result.to).toBe(new Date('2026-08-31T23:59:59.999Z').toISOString())
    expect(result.entries).toEqual([
      { user: bob, points: 90 },
      { user: alice, points: 10 },
    ])
  })

  it('treats a from-only range as open-ended', async () => {
    prisma.user.findMany.mockResolvedValue([alice])
    prisma.pointLog.groupBy.mockResolvedValue([])

    const result = await pointsService.getPointsStats('2026-08-01')

    expect(prisma.pointLog.groupBy).toHaveBeenCalledWith({
      by: ['userId'],
      where: { type: 'EARNED', createdAt: { gte: new Date('2026-08-01') } },
      _sum: { amount: true },
    })
    expect(result.to).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`): `npx jest src/__tests__/services/points.service.test.ts -t "getPointsStats"`
Expected: FAIL with `pointsService.getPointsStats is not a function`.

- [ ] **Step 3: Implement `getPointsStats`**

Add to `backend/src/services/points.service.ts`, after `getWeeklyPoints`:

```ts
export async function getPointsStats(fromStr?: string, toStr?: string) {
  const from = fromStr ? new Date(fromStr) : startOfWeekUTC(new Date())

  let toExclusive: Date | undefined
  if (toStr) {
    const to = new Date(toStr)
    toExclusive = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1))
  }

  const [users, sums] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CHILD' },
      select: { id: true, name: true, color: true, role: true },
    }),
    prisma.pointLog.groupBy({
      by: ['userId'],
      where: {
        type: 'EARNED',
        createdAt: toExclusive ? { gte: from, lt: toExclusive } : { gte: from },
      },
      _sum: { amount: true },
    }),
  ])

  const pointsByUser = new Map(sums.map(s => [s.userId, s._sum.amount ?? 0]))
  return {
    from: from.toISOString(),
    to: toExclusive ? new Date(toExclusive.getTime() - 1).toISOString() : null,
    entries: users
      .map(user => ({ user, points: pointsByUser.get(user.id) ?? 0 }))
      .sort((a, b) => b.points - a.points),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `backend/`): `npx jest src/__tests__/services/points.service.test.ts`
Expected: PASS, including all pre-existing tests in the file.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/points.service.ts backend/src/__tests__/services/points.service.test.ts
git commit -m "feat: getPointsStats service for arbitrary date-range points"
```

---

### Task 2: `GET /api/points/stats` Route

**Files:**
- Modify: `backend/src/routes/points.routes.ts`
- Test: `backend/src/__tests__/points.test.ts`

**Interfaces:**
- Consumes: `pointsService.getPointsStats(fromStr?, toStr?)` from Task 1.
- Produces: `GET /api/points/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` returning `{ success: true, data: { from, to, entries }, error: null }`. Both query params optional; a validation error follows this codebase's existing shape: `{ success: false, data: null, error: { code: 'VALIDATION_ERROR', message } }`.

- [ ] **Step 1: Write the failing integration tests**

Add to `backend/src/__tests__/points.test.ts`, after the existing `describe('GET /api/points/weekly', ...)` block:

```ts
describe('GET /api/points/stats', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/points/stats')
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).get('/api/points/stats').set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('defaults to the current week when no range is given', async () => {
    const res = await request(app).get('/api/points/stats').set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('from')
    expect(res.body.data.to).toBeNull()
    expect(Array.isArray(res.body.data.entries)).toBe(true)
    expect(res.body.data.entries.every((e: { user: { role: string } }) => e.user.role === 'CHILD')).toBe(true)
  })

  it('accepts an explicit from/to range', async () => {
    const res = await request(app)
      .get('/api/points/stats?from=2026-01-01&to=2026-12-31')
      .set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data.from).toBe(new Date('2026-01-01').toISOString())
    expect(res.body.data.to).toBe(new Date('2026-12-31T23:59:59.999Z').toISOString())
  })

  it('rejects an invalid date string', async () => {
    const res = await request(app).get('/api/points/stats?from=not-a-date').set('Cookie', parentCookies)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`, requires the DB bootstrap from root `AGENTS.md` — `DATABASE_URL="file:./dev.db" npx prisma db push && npm run prisma:seed` if not already done this session):

```bash
DATABASE_URL="file:./dev.db" npx jest src/__tests__/points.test.ts -t "GET /api/points/stats"
```

Expected: FAIL with 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the route**

Add to `backend/src/routes/points.routes.ts`, after the existing `/weekly` route:

```ts
router.get('/stats', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const { from, to } = req.query
    if (from !== undefined && typeof from !== 'string') {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'from must be an ISO date string' } })
    }
    if (to !== undefined && typeof to !== 'string') {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'to must be an ISO date string' } })
    }
    if (from !== undefined && Number.isNaN(Date.parse(from))) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'from must be a valid ISO date' } })
    }
    if (to !== undefined && Number.isNaN(Date.parse(to))) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'to must be a valid ISO date' } })
    }
    const result = await pointsService.getPointsStats(from as string | undefined, to as string | undefined)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})
```

This mirrors `backend/src/routes/assignments.routes.ts:11-25`'s inline query validation exactly, including the error shape.

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `backend/`):

```bash
DATABASE_URL="file:./dev.db" npx jest src/__tests__/points.test.ts
```

Expected: PASS, including all pre-existing tests in the file.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/points.routes.ts backend/src/__tests__/points.test.ts
git commit -m "feat: GET /api/points/stats route for arbitrary date-range points"
```

---

### Task 3: Frontend API + Hook

**Files:**
- Modify: `frontend/src/api/points.api.ts`
- Modify: `frontend/src/hooks/usePoints.tsx`

**Interfaces:**
- Consumes: `GET /api/points/stats` from Task 2, via `createApiClient('/api/points')` (already instantiated as `api` in `points.api.ts` — do not create a new axios instance, per the `createApiClient()` CSRF rule in root `AGENTS.md`).
- Produces: `getPointsStats(from?: string, to?: string): Promise<PointsStatsResponse>` and `usePointsStats(from?: string, to?: string)` (a `useQuery` hook) — both consumed by Task 4's `PointsStats` component.

- [ ] **Step 1: Add API types and function**

Add to `frontend/src/api/points.api.ts`, after `getWeeklyPoints`:

```ts
export interface PointsStatsEntry {
  user: { id: number; name: string; color: string; role: string }
  points: number
}

export interface PointsStatsResponse {
  from: string
  to: string | null
  entries: PointsStatsEntry[]
}

export async function getPointsStats(from?: string, to?: string): Promise<PointsStatsResponse> {
  const response = await api.get('/stats', { params: { from, to } })
  return response.data.data
}
```

(axios omits `params` entries whose value is `undefined`, so calling `getPointsStats()` with no args sends `GET /stats` with no query string — matching the route's "no range → current week" default.)

- [ ] **Step 2: Add the hook**

Add to `frontend/src/hooks/usePoints.tsx`, after `useWeeklyPoints`:

```ts
export function usePointsStats(from?: string, to?: string) {
  return useQuery({
    queryKey: ['points', 'stats', from ?? null, to ?? null],
    queryFn: () => pointsApi.getPointsStats(from, to),
  })
}
```

- [ ] **Step 3: Typecheck**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: PASS (no consumers yet, so this only checks the new code compiles).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/points.api.ts frontend/src/hooks/usePoints.tsx
git commit -m "feat: frontend API/hook for points stats range"
```

---

### Task 4: `PointsStats` Card on `ParentDashboard`

**Files:**
- Create: `frontend/src/components/PointsStats.tsx`
- Create: `frontend/src/__tests__/PointsStats.test.tsx`
- Modify: `frontend/src/pages/ParentDashboard.tsx`
- Modify: `frontend/src/__tests__/ParentDashboard.test.tsx`

**Interfaces:**
- Consumes: `usePointsStats(from?, to?)` from Task 3; `PointsStatsEntry`/`PointsStatsResponse` types from Task 3; `Card` (`../components/ui/Card`), `Avatar` (`../components/ui/Avatar`), `Skeleton` (`../components/ui/Skeleton`) — all existing shared UI components already imported elsewhere in `ParentDashboard.tsx`.
- Produces: `PointsStats` — a React component with no props (it manages its own period-selection state and calls `usePointsStats` internally), rendered by `ParentDashboard`.

- [ ] **Step 1: Write the component test first**

Create `frontend/src/__tests__/PointsStats.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PointsStats } from '../components/PointsStats'

vi.mock('../hooks/usePoints', () => ({ usePointsStats: vi.fn() }))
import { usePointsStats } from '../hooks/usePoints'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderCard() {
  return render(
    <QueryClientProvider client={queryClient}>
      <PointsStats />
    </QueryClientProvider>
  )
}

describe('PointsStats', () => {
  beforeEach(() => {
    ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        from: '2026-08-25T00:00:00.000Z',
        to: null,
        entries: [
          { user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }, points: 40 },
          { user: { id: 4, name: 'Bob', color: '#F59E0B', role: 'CHILD' }, points: 10 },
        ],
      },
      isLoading: false,
    })
  })

  it('defaults to the This week period and shows each child\'s points', () => {
    renderCard()
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('switches period on click and calls usePointsStats with a computed range', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'This month' }))
    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false')
    const lastCall = (usePointsStats as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    expect(lastCall[0]).toEqual(expect.any(String))
    expect(lastCall[1]).toEqual(expect.any(String))
  })

  it('shows a loading skeleton while fetching', () => {
    ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined, isLoading: true })
    renderCard()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('shows an empty state when no points were earned in range', () => {
    ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { from: '2026-08-25T00:00:00.000Z', to: null, entries: [] },
      isLoading: false,
    })
    renderCard()
    expect(screen.getByText('No points earned in this period.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npx vitest run src/__tests__/PointsStats.test.tsx`
Expected: FAIL — `frontend/src/components/PointsStats.tsx` doesn't exist yet.

- [ ] **Step 3: Implement `PointsStats`**

Create `frontend/src/components/PointsStats.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Avatar } from './ui/Avatar'
import { Card } from './ui/Card'
import { Skeleton } from './ui/Skeleton'
import { usePointsStats } from '../hooks/usePoints'

type Period = 'week' | 'month' | 'last30'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'last30', label: 'Last 30 days' },
]

function startOfWeekUTC(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - day)
  return monday
}

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeForPeriod(period: Period): { from: string; to: string } {
  const now = new Date()
  const to = toDateParam(now)
  if (period === 'week') return { from: toDateParam(startOfWeekUTC(now)), to }
  if (period === 'month') return { from: toDateParam(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to }
  const last30 = new Date(now)
  last30.setUTCDate(last30.getUTCDate() - 29)
  return { from: toDateParam(last30), to }
}

export function PointsStats() {
  const [period, setPeriod] = useState<Period>('week')
  const { from, to } = useMemo(() => rangeForPeriod(period), [period])
  const { data, isLoading } = usePointsStats(from, to)

  return (
    <div>
      <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Points stats</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              period === p.id ? 'bg-accent text-zinc-950' : 'bg-surface-raised text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !data || data.entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No points earned in this period.</p>
      ) : (
        <Card className="divide-y divide-edge p-0">
          {data.entries.map(entry => (
            <div key={entry.user.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={entry.user.name} color={entry.user.color} size="sm" />
              <span className="flex-1 font-medium text-zinc-200">{entry.user.name}</span>
              <span className="font-display font-bold text-zinc-100">{entry.points}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npx vitest run src/__tests__/PointsStats.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire `PointsStats` into `ParentDashboard`**

In `frontend/src/pages/ParentDashboard.tsx`, add the import near the other component imports:

```tsx
import { PointsStats } from '../components/PointsStats'
```

Add a new block inside the existing `<section className="space-y-8">` sidebar (after the `Latest win` `<div>`, before the closing `</section>` at line 292):

```tsx
          <div>
            <PointsStats />
          </div>
```

- [ ] **Step 6: Update `ParentDashboard.test.tsx`'s `usePoints` mock**

In `frontend/src/__tests__/ParentDashboard.test.tsx`:

Change the mock factory (lines 30-33) to include the new hook:

```tsx
vi.mock('../hooks/usePoints', () => ({
  useLeaderboard: vi.fn(),
  useWeeklyPoints: vi.fn(),
  usePointsStats: vi.fn(),
}))
```

Change the import (line 41) to include it:

```tsx
import { useLeaderboard, useWeeklyPoints, usePointsStats } from '../hooks/usePoints'
```

Add a default mock return in `mockParentState` (after the existing `useWeeklyPoints` mock, around line 94):

```tsx
  ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { from: '2026-06-15T00:00:00.000Z', to: null, entries: [] },
    isLoading: false,
  })
```

- [ ] **Step 7: Run the full frontend suite**

Run (from `frontend/`): `npm test`
Expected: PASS, same count as before plus `PointsStats.test.tsx`'s 4 new tests. `ParentDashboard.test.tsx` must still pass unchanged (it doesn't assert on `PointsStats` content, only that the page renders without crashing).

- [ ] **Step 8: Typecheck and build**

Run (from `frontend/`): `npx tsc --noEmit && npm run build`
Expected: both PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/PointsStats.tsx frontend/src/__tests__/PointsStats.test.tsx frontend/src/pages/ParentDashboard.tsx frontend/src/__tests__/ParentDashboard.test.tsx
git commit -m "feat: points stats card with period presets on parent dashboard"
```

---

### Task 5: Version Bump, Changelog

**Files:**
- Modify: `backend/package.json`, `frontend/package.json`, `.env`, `.env.example`, `CHANGELOG.md`
- Modify: `backend/package-lock.json`, `frontend/package-lock.json` (regenerated)

- [ ] **Step 1: Bump versions**

Edit `"version": "3.8.0"` to `"version": "3.9.0"` in both `backend/package.json` and `frontend/package.json` (assumes the ntfy-links plan, v3.8.0, landed first — if this plan lands first instead, bump from whatever the current version is at execution time, and adjust CHANGELOG placement accordingly).

- [ ] **Step 2: Update env files**

In `.env.example`, change `APP_VERSION=` to the new version. Update `.env` too if present locally (gitignored).

- [ ] **Step 3: Regenerate lockfiles**

```bash
rm -f backend/package-lock.json && cd backend && npm install && cd ..
rm -f frontend/package-lock.json && cd frontend && npm install && cd ..
```

- [ ] **Step 4: Add CHANGELOG entry**

Insert a new `## [3.9.0] - 2026-09-17` heading above the most recent existing entry in `CHANGELOG.md`:

```markdown
## [3.9.0] - 2026-09-17

### Added
- `GET /api/points/stats?from=&to=` — per-child earned points over an arbitrary date range, generalizing the fixed-current-week `GET /api/points/weekly` seed (which is unchanged and still used on the dashboard's "Pts this week" tile). Parent-only, same as `/weekly`. Defaults to the current week when no range is given.
- `PointsStats` card on the parent dashboard with This week / This month / Last 30 days period presets, backed by the new endpoint.
```

- [ ] **Step 5: Run both full test suites**

Run (from `backend/`): `npm test`
Run (from `frontend/`): `npm test`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json frontend/package.json backend/package-lock.json frontend/package-lock.json .env.example CHANGELOG.md
git commit -m "chore: bump APP_VERSION to 3.9.0 for points stats range"
```

---

## Self-Review Notes

- **Spec coverage:** "Points statistics over a period — per week, per month, arbitrary range" — Task 1/2 deliver arbitrary `from`/`to` at the API level (week/month are just precomputed ranges, not separate endpoints); Task 4 surfaces week/month/last-30-days presets in the UI, satisfying the "per week, per month" phrasing without over-building a custom date-range picker UI (out of scope per the brainstorm — presets cover the stated need; a free-form picker can be a follow-up if requested).
- **No placeholder risk:** `to: string | null` is threaded consistently from `points.service.ts` → route → `PointsStatsResponse` → `PointsStats` component.
- **Type consistency check:** `PointsStatsEntry`/`PointsStatsResponse` in `points.api.ts` (Task 3) match the exact shape returned by `getPointsStats` in `points.service.ts` (Task 1): `{ from: string; to: string | null; entries: { user; points }[] }`.
