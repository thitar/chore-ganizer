---
title: Testing Patterns
last_mapped_commit: HEAD
date: 2026-07-12
---

# Testing Patterns

## Overview

| Layer | Framework | Count | Command |
|-------|-----------|-------|---------|
| Backend unit | Jest v30 + ts-jest | ~508 tests (17 files) | `cd backend && npm test` |
| Frontend unit | Vitest v4 + React Testing Library | ~137 tests (15 files) | `cd frontend && npm test` |
| E2E | Playwright v1.50 | 54 UAT items (10 sections) | `npx playwright test e2e/uat-checklist.spec.ts --config playwright.uat.config.ts --project=chromium` |

## Backend Testing

### Framework & Config

- **Jest v30** with `ts-jest ^29.3.0` preset
- **Environment:** `node`
- **Config:** `backend/jest.config.js`
- **Test match:** `**/__tests__/**/*.test.ts`
- **clearMocks:** `true` (auto-cleared between tests)

### Test Structure

```
backend/src/__tests__/
├── app.test.ts                     # App startup guards
├── assignments.test.ts             # Assignment API (supertest)
├── points.test.ts                  # Points API (supertest)
├── recurring.test.ts               # Recurring chores API (supertest)
├── templates.test.ts               # Templates API (supertest)
├── users.test.ts                   # Users API (supertest)
├── middleware/csrf.test.ts          # CSRF middleware
├── routes/__tests__/auth.routes.test.ts  # Auth routes (supertest)
└── services/
    ├── assignment.service.test.ts
    ├── points.service.test.ts
    ├── recurring.service.test.ts
    ├── template.service.test.ts
    ├── users.service.test.ts
    ├── gamification.service.test.ts
    ├── notification.service.test.ts
    └── notification.formatters.test.ts
```

### Prisma Mocking Pattern (canonical)

Every service test file follows this exact pattern:
```ts
jest.mock('../../config/prisma', () => ({
  prisma: {
    modelA: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), ... },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')
let service: typeof import('../../services/service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/service')]
  prisma.$transaction.mockImplementation((cb) => cb(prisma))
  service = require('../../services/service')
})
```

Key details:
- Mock defined **inline** per test file (no shared mock helper)
- `$transaction` invokes the callback with mocked prisma
- `delete require.cache` clears module cache for fresh imports
- `jest.clearAllMocks()` in `beforeEach`

### Integration Tests (supertest)

Route-level tests use `supertest` against the real Express app:
```ts
beforeAll(async () => {
  const res = await request(app).post('/api/auth/login').send({ email: '...', password: '...' })
  parentCookies = res.headers['set-cookie']
})
```

### Service Mocking

```ts
jest.mock('../../services/gamification.service', () => ({ awardBadges: jest.fn() }))
jest.mock('../../services/notification.service', () => ({ sendNtfy: jest.fn().mockResolvedValue(true) }))
```

### CSRF Testing

Overrides `NODE_ENV` to force CSRF middleware to run (normally bypassed in test env):
```ts
beforeEach(() => { process.env.NODE_ENV = 'production' })
afterEach(() => { process.env.NODE_ENV = originalNodeEnv })
```

## Frontend Testing

### Framework & Config

- **Vitest v4** with React Testing Library + jsdom
- **Config:** `frontend/vitest.config.ts`
- **Globals:** `true` (no need to import `describe`/`it`/`expect`)
- **Setup:** `frontend/src/test/setup.ts` — wires `jest-dom` matchers + `cleanup()`

### Test Structure

```
frontend/src/__tests__/
├── AssignmentsPage.test.tsx
├── CalendarPage.test.tsx
├── DashboardPage.test.tsx
├── gamification-ui.test.tsx
├── Leaderboard.test.tsx
├── motion.test.tsx
├── MyChoresPage.test.tsx
├── PointsPage.test.tsx
├── ProfilePage.test.tsx
├── RecurringChoresPage.test.tsx
├── scaffold.test.tsx
├── TemplatesPage.test.tsx
├── TopNav.test.tsx
├── ui.test.tsx
└── UsersPage.test.tsx
```

### Mocking Patterns

**Hook mocking:**
```ts
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }))
;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
  user: mockUser, isLoading: false, error: null, login: vi.fn(), logout: vi.fn(),
})
```

**No MSW or API mock server** — all API calls mocked at the hook level.

**Fake timers:**
```ts
vi.useFakeTimers({ now: new Date('2026-06-17T12:00:00Z'), toFake: ['Date'] })
```

**QueryClient setup:**
```ts
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
render(<Component />, { wrapper: ({ children }) => (
  <QueryClientProvider client={queryClient}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
)})
```

**No shared utilities:** No `renderWithRouter` helper, no mock data factories. Each test sets up its own mocks.

## E2E Testing

### Config

| Property | Dev Config | UAT Config |
|----------|-----------|------------|
| File | `e2e/playwright.config.ts` | `e2e/playwright.uat.config.ts` |
| baseURL | `http://localhost:5173` | `http://localhost:3002` |
| Web servers | Auto-starts dev servers | None (Docker deployment) |
| Browser | Chromium | Chromium |
| Timeout | 30s | 60s |
| Retries | 2 on CI | 0 |
| Workers | 1 on CI | Unlimited |

### Auth Setup

- `e2e/auth.setup.ts` runs as setup project (dependency of chromium)
- Logs in once per seeded user via real UI interaction
- Saves `storageState` (cookies) to `e2e/.auth/{user}.json`
- Specs call `login(page, user)` from `e2e/helpers/auth.ts` to replay saved session
- Avoids rate limiter (`AUTH_RATE_LIMIT_MAX` = 10 req/15min)

### UAT Checklist (`e2e/uat-checklist.spec.ts`)

54 test blocks across 10 sections:
1. Auth (6 items)
2. Chores child (2 items)
3. Chores parent (6 items)
4. Recurring chores (6 items)
5. Points (6 items)
6. Gamification (3 items)
7. Notifications (4 items — real ntfy push)
8. Profile/family (6 items)
9. Mobile viewport (5 items)
10. Calendar (6 items)

Uses `uiLogin()` (fresh UI login per test), `api()` helper for direct API calls, `shot()` for screenshots.

### Assertion Patterns

- UI: `page.waitForSelector()`, `page.locator().count()`, `page.getByText()`
- API: `expect(res.status).toBe(...)`, `expect(res.body.success).toBe(true)`
- Screenshots: `page.screenshot({ path: ..., fullPage: false })`

## Test Data

| Layer | Approach |
|-------|----------|
| Backend unit | Inline mock objects per test |
| Backend integration | Real seeded data from `prisma/seed.ts` |
| Frontend unit | Inline mock data, hook return mocking |
| E2E | Seeded data + API-created test data |

**Seeded accounts:** `dad@home.local`, `mom@home.local`, `alice@home.local`, `bob@home.local` (all `password123`)

## CI Integration

**No test jobs in CI.** The only CI workflow (`.github/workflows/security.yml`) runs:
- CodeQL analysis
- npm audit (backend + frontend)
- Gitleaks secret scanning
- Semgrep SAST
- Trivy container scanning

Tests are **not** run automatically on PRs or pushes.

## Coverage Gaps

**No tests for:**
- `occurrences.routes.ts`, `health.routes.ts`
- `rateLimiter.ts`, `validator.ts` middleware
- Several frontend components (`AppShell`, `BottomTabBar`, `FilterBar`, `StatusBadge`)
- Several frontend hooks (`useCalendar`, `useRecurringChores`, `useUsers`, `useDismissableMenu`)
- Frontend lib/utils (`celebrate.ts`, `apiClient.ts`, `csrf.ts`, `dateFormat.ts`, `assignmentKey.ts`)
- Error states and edge cases in E2E

**No lint/format tooling** configured for either package.
