# Architecture — Codebase Deep-Dive

System design, patterns, and data flow for Chore-Ganizer. Companion to `docs/ARCHITECTURE.md` (the high-level overview). This document focuses on the concrete implementation details an agent needs to navigate the code.

---

## Overall Architectural Pattern

**Client-server monorepo.** Two independent npm packages (`backend/` and `frontend/`) in a single Git repo, each producing its own Docker image. No shared code, no workspace linking, no build orchestration — each package installs and builds independently.

```
[Browser] → [nginx :80] → /api/* → [Express :3010] → [Prisma] → [SQLite file]
              static files ↗
```

- **Frontend**: React SPA served as static files by nginx (production) or Vite dev server (development). All API requests hit `/api/*`.
- **Backend**: Express HTTP server. No worker processes, no background jobs, no message queues. SQLite on a local file.
- **No shared modules** between frontend and backend — TypeScript types are defined independently in each package.

---

## Backend Layer Structure

```
Request → Middleware Chain → Route Handler → Service Function → Prisma → SQLite
                                                                    ↓
                                                           AppError (thrown)
                                                                    ↓
                                                        Global Error Handler → JSON response
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Middleware** | `src/middleware/` | Cross-cutting: auth, CSRF, rate limiting, validation, error handling |
| **Routes** | `src/routes/` | HTTP plumbing: parse request, call service, send response. Thin wrappers — no business logic. |
| **Services** | `src/services/` | Business logic: validation, authorization checks, DB queries via Prisma, notification dispatch |
| **Schemas** | `src/schemas/` | Zod schemas for request body validation (partial coverage — see below) |
| **Config** | `src/config/` | Singletons: Prisma client, ntfy configuration |
| **Types** | `src/types/` | TypeScript ambient declarations (session augmentation) |

### Route Files

Each resource has one route file mounted under `/api`:

| Route file | Mount path | Auth | Zod validation |
|------------|-----------|------|---------------|
| `health.routes.ts` | `/api/health` | None | None |
| `auth.routes.ts` | `/api/auth` | None (login/logout), `authenticate` (me) | None |
| `templates.routes.ts` | `/api/templates` | `authenticate`, `authorize('PARENT')` for mutations | Yes (`createTemplateSchema`, `updateTemplateSchema`) |
| `assignments.routes.ts` | `/api/assignments` | `authenticate` for reads, + `authorize('PARENT')` for mutations | Yes (`createAssignmentSchema`, `updateAssignmentSchema`) |
| `users.routes.ts` | `/api/users` | `authenticate`, `authorize('PARENT')` for create/delete | None (manual validation in service) |
| `recurring.routes.ts` | `/api/recurring` | `authenticate`, `authorize('PARENT')` for mutations | None |
| `occurrences.routes.ts` | `/api/occurrences` | `authenticate` | None |
| `points.routes.ts` | `/api/points` | `authenticate`, `authorize('PARENT')` for adjust | Yes (`adjustPointsSchema`) |

Route aggregation: `routes/index.ts` creates a single `Router` and mounts all sub-routers. This router is mounted on `/api` in `app.ts`.

### Service Files

Services are **exported as module functions** (not classes). Each file exports named async functions. There is no base class, no dependency injection, no interface abstraction — services import `prisma` directly from `config/prisma.ts`.

| Service | Key functions | Dependencies |
|---------|--------------|-------------|
| `auth.service.ts` | `login`, `logout`, `getCurrentUser` | prisma, bcrypt, AppError |
| `assignment.service.ts` | `create`, `getAll`, `update`, `complete`, `uncomplete`, `delete_`, `notifyDueSoon` | prisma, AppError, recurring.service, notification.service, gamification.service |
| `template.service.ts` | `create`, `getAll`, `update`, `delete_` | prisma, AppError |
| `users.service.ts` | `getAll`, `createUser`, `deleteUser`, `updatePassword`, `updateColor`, `updateNtfyTopic` | prisma, AppError, bcrypt |
| `recurring.service.ts` | `create`, `getAll`, `generateOccurrences`, `completeOccurrence`, `delete_` | prisma, AppError, gamification.service |
| `points.service.ts` | `getMyPoints`, `getUserPoints`, `adjustPoints`, `getLeaderboard` | prisma, AppError |
| `gamification.service.ts` | `getLifetimePoints`, `getStreak`, `computeLevel`, `evaluateBadges`, `awardBadges`, `getGamification` | prisma, notification.service |
| `notification.service.ts` | `sendNtfy`, `notifyChoreAssigned`, `notifyChoreDueSoon`, `notifyChoreCompleted` | config/notifications, notification.formatters |
| `notification.formatters.ts` | `assignedBody`, `dueSoonBody`, `badgeEarnedBody`, `completedBody` | (pure functions, no dependencies) |

**Cross-service calls**: `assignment.service.ts` calls into `recurring.service.ts` (to generate occurrences), `notification.service.ts` (fire-and-forget), and `gamification.service.ts` (award badges). `recurring.service.ts` also calls `gamification.service.ts`. These are direct function imports, not events or message passing.

### Schema Files (Zod)

Only 3 of 8 route files use Zod validation:

| Schema file | Used by |
|-------------|---------|
| `assignment.schema.ts` | `assignments.routes.ts` — `createAssignmentSchema`, `updateAssignmentSchema` |
| `template.schema.ts` | `templates.routes.ts` — `createTemplateSchema`, `updateTemplateSchema` |
| `points.schema.ts` | `points.routes.ts` — `adjustPointsSchema` |

`auth.routes.ts`, `users.routes.ts`, `recurring.routes.ts`, and `occurrences.routes.ts` read `req.body` directly with no Zod schema. Validation in those routes is either manual (e.g., `users.service.ts` has inline regex checks) or absent.

---

## Frontend Layer Structure

```
Page Component → Hook (TanStack Query) → API Module → axios instance (createApiClient)
                                                         ↓
                                                   CSRF interceptor (reads XSRF-TOKEN cookie)
                                                         ↓
                                                   Express backend :3010
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Pages** | `src/pages/` | Full-page components. Each page wraps content in `<AppShell>`. Contains UI state and event handlers. |
| **Components** | `src/components/` | Shared UI: navigation (`TopNav`, `BottomTabBar`), layout (`AppShell`), domain widgets (`Leaderboard`, `LevelBar`, `BadgeGrid`, `FilterBar`, `StatusBadge`, `ConfirmDelete`, `GamificationMoments`) |
| **UI primitives** | `src/components/ui/` | Design-system atoms: `Avatar`, `Button`, `Card`, `CountUp`, `EmptyState`, `PageError`, `PageHeader`, `PageLoading`, `ProgressRing`, `Skeleton`, `StatCard`, `Toast` |
| **Hooks** | `src/hooks/` | TanStack Query wrappers per domain + `useDismissableMenu` (UI utility) |
| **API modules** | `src/api/` | Axios-based HTTP clients per domain. Each uses `createApiClient()`. Defines TypeScript interfaces for request/response. |
| **Lib** | `src/lib/` | `apiClient.ts` (factory), `csrf.ts` (interceptor), `celebrate.ts` (confetti) |
| **Utils** | `src/utils/` | Pure functions: `a11y.ts`, `assignmentKey.ts`, `dateFormat.ts` |
| **Test setup** | `src/test/` | `setup.ts` — jest-dom matchers + cleanup |

### Route Definitions (App.tsx)

React Router v6, all routes defined in `App.tsx`:

| Path | Component | Auth | Role gate |
|------|-----------|------|-----------|
| `/login` | `LoginPage` | None | None |
| `/` | `DashboardPage` | `ProtectedRoute` | Any authenticated |
| `/templates` | `TemplatesPage` | `ProtectedRoute` | `PARENT` |
| `/recurring-chores` | `RecurringChoresPage` | `ProtectedRoute` | `PARENT` |
| `/assignments` | `AssignmentsPage` | `ProtectedRoute` | `PARENT` |
| `/users` | `UsersPage` | `ProtectedRoute` | `PARENT` |
| `/my-chores` | `MyChoresPage` | `ProtectedRoute` | Any authenticated |
| `/points` | `PointsPage` | `ProtectedRoute` | Any authenticated |
| `/calendar` | `CalendarPage` | `ProtectedRoute` | Any authenticated |
| `/profile` | `ProfilePage` | `ProtectedRoute` | Any authenticated |
| `*` | Redirect to `/` | — | — |

### Provider Hierarchy (main.tsx)

```
<StrictMode>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
</StrictMode>
```

- `QueryClientProvider` — TanStack Query context (retry: false, staleTime: 5min)
- `AuthProvider` — React Context for auth state (wraps a `useQuery` for `/api/auth/me`)
- `App` — React Router with all routes

---

## Data Flow — Request Lifecycle

### 1. HTTP Request Arrives

```
Client POST /api/assignments/:id/complete
  ↓
helmet() — security headers
  ↓
cors() — CORS_ORIGIN, credentials: true
  ↓
generalLimiter — 300 req/15min (skipped in test)
  ↓
express.json() — 10kb limit
  ↓
cookie-parser
  ↓
express-session — reads/creates session cookie
  ↓
csrfProtection — sets XSRF-TOKEN cookie if missing; validates x-xsrf-token header on mutations
  ↓
Route handler
```

### 2. Route Handler Executes

```typescript
// assignments.routes.ts
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const assignment = await assignmentService.complete(id, req.session.userId!)
    res.json({ success: true, data: assignment, error: null })
  } catch (err) {
    next(err)  // ← delegates to global error handler
  }
})
```

Key patterns:
- `authenticate` middleware runs first — validates session, populates `req.session.userId` and `req.session.role`
- Route handler is a `try/catch` that calls a service function
- Success: `res.json({ success: true, data: ..., error: null })` — consistent envelope
- Error: `next(err)` — throws an `AppError` or unexpected error

### 3. Service Function Executes

```typescript
// assignment.service.ts — complete()
const assignment = await prisma.choreAssignment.findUnique({ ... })
if (!assignment) throw new AppError('Assignment not found', 404)
// ... business logic, Prisma queries ...
// Side effects (fire-and-forget):
void awardBadges(assignment.assignedToId)
```

Key patterns:
- Services throw `AppError` for expected errors (404, 403, 409)
- Services use `prisma.$transaction()` for multi-step mutations
- Side effects (notifications, badge awards) are fire-and-forget (`void fn()`)
- Return values are plain objects (Prisma results or plain data)

### 4. Response Envelope

Every successful response:
```json
{ "success": true, "data": <payload>, "error": null }
```

Every error response:
```json
{ "success": false, "data": null, "error": { "message": "...", "code": "..." } }
```

Validation error:
```json
{ "success": false, "data": null, "error": { "message": "Validation failed", "code": "VALIDATION_ERROR", "details": [...] } }
```

### 5. Global Error Handler

```typescript
// errorHandler.ts
if (err instanceof AppError) → respond with err.statusCode + err.message
else → 500 "Internal server error" + console.error
```

---

## Auth / Authorization Flow

### Backend Middleware Chain

```
1. Session check (req.session.userId exists?)
   ↓ No → 401 "Authentication required"
2. DB check (user still exists?)
   ↓ No → destroy session, clear cookie, 401
3. next() — session is valid
```

`authorize(...roles)` (separate middleware):
```
Check req.session.role is in the allowed roles
  ↓ No → 403 "Forbidden"
```

### Login Flow

```
POST /api/auth/login { email, password }
  ↓
authLimiter (10 req/15min)
  ↓
authService.login(email, password)
  ↓ bcrypt.compare
  ↓
req.session.regenerate() → sets userId, role on session
  ↓
Response: { success: true, data: user (no password) }
  ↓
CSRF middleware sets XSRF-TOKEN cookie on this response
```

### Frontend Auth Flow

```
1. App loads → useAuth() calls GET /api/auth/me via React Query
   ↓ 200 → user object stored in query cache ['auth', 'me']
   ↓ 401 → AuthError thrown → ProtectedRoute redirects to /login
   ↓ Network error → ProtectedRoute shows "Connection Error"

2. LoginPage calls authApi.login() → POST /api/auth/login
   ↓ 200 → queryClient.invalidateQueries(['auth']) → re-fetches /api/auth/me
   ↓ Error → "Invalid email or password" shown

3. Logout → authApi.logout() → POST /api/auth/logout
   ↓ queryClient.clear() + setQueryData(['auth','me'], null)
   ↓ → ProtectedRoute sees no user → redirects to /login
```

### CSRF Protection

- **Backend** (`middleware/csrf.ts`): Double-submit cookie pattern. Every response gets an `XSRF-TOKEN` cookie (non-httpOnly). Mutating requests must include `x-xsrf-token` header matching the cookie value.
- **Frontend** (`lib/csrf.ts`): Axios interceptor reads `XSRF-TOKEN` from `document.cookie` and sets the `x-xsrf-token` header on every mutating request. Applied to every axios instance via `createApiClient()`.
- **Test bypass**: CSRF middleware skips validation when `NODE_ENV === 'test'`.

---

## Error Handling Pattern

### Backend

**`AppError` class** (`middleware/errorHandler.ts`):
```typescript
class AppError extends Error {
  statusCode: number
  code?: string
}
```

Services throw `AppError` for expected error conditions:
- 400: Bad input, validation failures
- 401: Invalid credentials, current password wrong
- 403: Unauthorized (child trying to view another's points)
- 404: Resource not found
- 409: Conflict (already completed, cannot delete with active data)

**Route error forwarding**: Every route handler wraps service calls in `try/catch` and calls `next(err)` on failure.

**Global error handler**: Catches all errors. `AppError` → mapped to status code + message. Unknown errors → 500 + `console.error`.

**Prisma-specific**: Services check for Prisma error code `P2025` (Record not found) and convert to 404 `AppError`.

### Frontend

- **React Query error state**: Each hook exposes `error` from `useQuery`. Pages render error UI based on this.
- **`AuthError` class** (`api/auth.api.ts`): Custom error for 401 responses. `ProtectedRoute` detects this and redirects to `/login`.
- **Mutation errors**: Caught in page-level `try/catch` handlers, displayed as toast or inline error messages.
- **No global error boundary**: Unhandled React errors will crash the component tree (no ErrorBoundary component exists).

---

## State Management Approach

### Server State (primary)

**TanStack Query (`@tanstack/react-query`)** is the sole source of truth for server data. There is no Redux, no Zustand, no global client-side store.

Query key conventions:
| Domain | Query key | Used by |
|--------|-----------|---------|
| Auth | `['auth', 'me']` | `useAuth` |
| Assignments | `['assignments']` | `useAssignments` |
| Templates | `['templates']` | `useTemplates` |
| Users | `['users']` | `useUsers` |
| Recurring chores | `['recurring-chores']` | `useRecurringChores` |
| Points (me) | `['points', 'me']` | `useMyPoints` |
| Points (user) | `['points', 'user', id]` | `useUserPoints` |
| Leaderboard | `['points', 'leaderboard']` | `useLeaderboard` |
| Gamification | `['points', 'gamification']` | `useGamification` |
| Calendar | `['calendar', year, month]` | `useCalendarMonth` |

**Cache invalidation** happens on mutation success:
- Mutations invalidate their own domain query (e.g., `createMutation.onSuccess` invalidates `['assignments']`)
- Cross-domain invalidation: completing a chore invalidates `['assignments']`, `['points']`, and `['points', 'gamification']`
- Logout: `queryClient.clear()` wipes everything, then sets `['auth', 'me']` to `null`

**Stale time**: Default 5 minutes (set in `QueryClient` default options). `['auth', 'me']` uses `staleTime: Infinity` (never refetches in background). `['users']` uses 5 minutes.

### Client State (minimal)

Only local UI state exists:
- Form inputs (useState in page components)
- Filter states (useState in page components)
- Menu open/close (useState in `TopNav`, `BottomTabBar`)
- Toast messages (useState in page components)
- `GamificationMoments` uses `useRef` to track previous gamification data for diffing

There is no shared client state beyond the auth context (which is just a thin wrapper around TanStack Query).

---

## Key Abstractions

### Service Pattern

Services are plain modules with exported async functions. No classes, no interfaces, no DI container. The pattern is:

```typescript
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export async function someOperation(params) {
  // 1. Validate / authorize
  const entity = await prisma.entity.findUnique({ ... })
  if (!entity) throw new AppError('Not found', 404)
  
  // 2. Business logic
  // 3. Database operations (possibly in a transaction)
  // 4. Side effects (fire-and-forget)
  // 5. Return result
}
```

### Frontend Hook Pattern

Each domain hook wraps TanStack Query:

```typescript
export function useDomain() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['domain'],
    queryFn: domainApi.getAll,
  })
  
  const createMutation = useMutation({
    mutationFn: domainApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domain'] }),
  })
  
  return {
    data,
    isLoading,
    error,
    create: (params) => createMutation.mutateAsync(params),
    isCreating: createMutation.isPending,
    // ... other mutations
  }
}
```

### Frontend API Module Pattern

Each API module creates a dedicated axios instance:

```typescript
import { createApiClient } from '../lib/apiClient'

const api = createApiClient('/api/domain')

export interface DomainType { ... }

export async function getAll(): Promise<DomainType[]> {
  const response = await api.get('/')
  return response.data.data  // unwrap envelope
}
```

### Frontend-Backend Parameter Mapping

The frontend uses simplified names in its API layer, mapped to backend expectations:

| Frontend API param | Backend param | Where mapped |
|--------------------|--------------|-------------|
| `userId` | `assignedToId` | `assignments.api.ts`, `recurring.api.ts` |
| `templateId` | `choreTemplateId` | `assignments.api.ts`, `recurring.api.ts` |

This mapping happens exclusively in `frontend/src/api/` files, never in hooks or components.

---

## Middleware Chain (Exact Order)

Verified against `backend/src/app.ts`:

1. `helmet()` — Security headers
2. `cors({ origin, credentials: true })` — CORS
3. `generalLimiter` on `/api` — 300 req/15min (skipped in test)
4. `express.json({ limit: '10kb' })` + `express.urlencoded()` — Body parsing
5. `cookie-parser` — Cookie parsing
6. `express-session` — Session management (in-memory `MemoryStore`)
7. `csrfProtection` on `/api` — Sets `XSRF-TOKEN` cookie; validates `x-xsrf-token` header on mutations (skipped in test)
8. `routes` on `/api` — Route handlers (each route may apply `authenticate`, `authorize`, `validate` middleware inline)
9. `notFoundHandler` — 404 for unmatched routes
10. `errorHandler` — Global error handler

**Additional route-level middleware**:
- `authLimiter` — applied only to `POST /api/auth/login` (10 req/15min)
- `authenticate` — applied per-route, validates session against DB
- `authorize('PARENT')` — applied per-route, checks `req.session.role`
- `validate(schema)` — applied per-route, Zod schema validation (only assignments, templates, points)

---

## Database Model (Prisma → SQLite)

Six models, all plain `String` fields for enums (SQLite has no native enum type):

| Model | Purpose | Key relationships |
|-------|---------|------------------|
| `User` | Family members (PARENT/CHILD) | Has assignments, pointLogs, badges, recurring chores (both assigned and created) |
| `ChoreTemplate` | Reusable chore definitions | Created by a User; has assignments and recurring chores |
| `ChoreAssignment` | One-off chore instance | Belongs to template and user |
| `RecurringChore` | Recurrence rule | Belongs to template, assigned user, created user |
| `RecurringOccurrence` | Generated instance of recurring chore | `onDelete: SetNull` on `recurringChoreId` — preserves history |
| `PointLog` | Append-only point ledger | Belongs to user |
| `UserBadge` | Badge award record | `onDelete: Cascade` on user; `@@unique([userId, badgeId])` |

Key constraints:
- `RecurringOccurrence @@unique([recurringChoreId, dueDate])` — makes lazy generation idempotent
- `UserBadge @@unique([userId, badgeId])` — prevents duplicate badge awards
- Indexes on `assignedToId`, `dueDate`, `status` in assignment/occurrence tables
- `User.lifetimePoints` — self-healing cache, incremented at every positive PointLog write site
- `User.streakCount` + `streakComputedAt` — lazy weekly cache

---

## Notification Flow

**Pattern**: Fire-and-forget HTTP calls to ntfy.sh (or self-hosted ntfy).

```
Service function → void sendNtfy(topic, title, body, opts)
                         ↓
                    fetch(NTFY_BASE_URL/topic, { method: 'POST', ... })
                         ↓
                    Caught internally, logged, never fails the request
```

Triggered from:
- `assignment.service.ts` — `notifyChoreAssigned()` (on create), `notifyDueSoon()` (on getAll, lazy sweep)
- `gamification.service.ts` — `awardBadges()` → badge earned notifications

If `NTFY_BASE_URL` is unset, all notification calls silently no-op.

---

## Deployment Architecture

### Docker Compose (Production)

```
[docker-compose.yml]
  ├── frontend service (nginx, port 3002→80)
  │   └── depends_on: backend (healthy)
  └── backend service (Node.js, port 3010)
      └── volume: DATA_DIR (SQLite database)
```

- Frontend: Multi-stage build → nginx serves static SPA + reverse-proxies `/api/*` to backend
- Backend: Multi-stage build → `node dist/server.js` (compiled TypeScript)
- Both share a Docker bridge network (`chore-ganizer-network`)
- SQLite database stored in a bind-mounted host directory (`DATA_DIR`)

### Development

- Backend: `cd backend && npm run dev` (ts-node, port 3010)
- Frontend: `cd frontend && npm run dev` (Vite, port 5173, proxies `/api/*` to localhost:3010)
- E2E: `npm run test:e2e` from repo root (Playwright, requires both dev servers running)

---

## Testing Architecture

### Backend Unit Tests (Jest)

- Location: `backend/src/__tests__/` (routes, middleware) and `backend/src/__tests__/services/` (services)
- Pattern: `jest.mock('../../config/prisma', () => ({ prisma: { ... } }))` — inline Prisma mock per test file
- No shared mock helper or factory — each test file sets up its own mocks
- Run: `cd backend && npm test`

### Frontend Unit Tests (Vitest)

- Location: `frontend/src/__tests__/`
- Pattern: `vi.mock()` per test file for API modules; `@testing-library/react` for rendering
- Setup: `frontend/src/test/setup.ts` — jest-dom matchers + cleanup
- Run: `cd frontend && npm test`

### E2E Tests (Playwright)

- Location: `e2e/` (repo root)
- Setup: `e2e/auth.setup.ts` — logs in once per seeded user, saves `storageState` to `e2e/.auth/*.json`
- Helpers: `e2e/helpers/auth.ts` (session replay), `e2e/helpers/csrf.ts`, `e2e/helpers/nav.ts`
- Configs: `e2e/playwright.config.ts` (full suite), `e2e/playwright.uat.config.ts` (UAT subset)
- Run: `npm run test:e2e` from repo root
