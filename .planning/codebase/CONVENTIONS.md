# CONVENTIONS.md -- Code Style and Patterns

## Code Style

### Indentation
- **Backend**: 2-space indentation throughout all TypeScript files
- **Frontend**: 2-space indentation throughout all TypeScript/TSX files
- **E2E**: 2-space indentation in all spec and helper files

### Quotes
- No Prettier or ESLint config is checked in for either package. Quote style is not enforced.
- Most source files use single quotes for string literals; JSX attribute values use double quotes.

### Semicolons
- **No semicolons** is the dominant convention across both backend and frontend source files.
- Inconsistency exists in some test files where semicolons appear after imports (e.g. `import { expect } from 'vitest';`).

### Trailing Commas
- No enforced trailing comma policy. Multi-line object literals and function calls often include trailing commas; single-line contexts do not.

### tsconfig Strictness
- **Backend** (`backend/tsconfig.json`): `"strict": true`, `"esModuleInterop": true`, `"forceConsistentCasingInFileNames": true`. Module: `commonjs`. Target: `ES2020`. Test files excluded from compilation.
- **Frontend** (`frontend/tsconfig.json`): `"strict": true`, `"noUnusedLocals": false`, `"noUnusedParameters": false`, `"noFallthroughCasesInSwitch": true`. Module: `ESNext`. Target: `ES2020`. Types include `vitest/globals` and `@testing-library/jest-dom`.
- **E2E** (`e2e/tsconfig.json`): `"strict": true`, Module: `commonjs`. Types: `["node"]`.

### No Lint/Format Tooling
There is no ESLint, Prettier, or `.editorconfig` file in the repository. Code formatting is enforced only by convention.

---

## Naming Conventions

### Files
- **Backend services**: `kebab-case.service.ts` (e.g. `assignment.service.ts`, `gamification.service.ts`, `notification.formatters.ts`)
- **Backend routes**: `kebab-case.routes.ts` (e.g. `assignments.routes.ts`, `points.routes.ts`)
- **Backend schemas**: `kebab-case.schema.ts` (e.g. `assignment.schema.ts`)
- **Backend middleware**: `kebab-case.ts` (e.g. `errorHandler.ts`, `rateLimiter.ts`, `csrf.ts`)
- **Backend config**: `kebab-case.ts` (e.g. `prisma.ts`, `notifications.ts`)
- **Frontend API modules**: `kebab-case.api.ts` (e.g. `assignments.api.ts`, `auth.api.ts`)
- **Frontend hooks**: `usePascalCase.tsx` (e.g. `useAuth.tsx`, `useAssignments.tsx`)
- **Frontend pages**: `PascalCasePage.tsx` (e.g. `DashboardPage.tsx`, `AssignmentsPage.tsx`)
- **Frontend components**: `PascalCase.tsx` (e.g. `ProtectedRoute.tsx`, `TopNav.tsx`, `BadgeGrid.tsx`)
- **Frontend UI primitives**: `PascalCase.tsx` inside `components/ui/` (e.g. `Button.tsx`, `Card.tsx`, `StatCard.tsx`)
- **Frontend utilities**: `kebab-case.ts` (e.g. `dateFormat.ts`, `assignmentKey.ts`, `a11y.ts`)
- **Frontend lib**: `kebab-case.ts` (e.g. `apiClient.ts`, `csrf.ts`, `celebrate.ts`)
- **Test files**: `*.test.ts` or `*.test.tsx` (backend and frontend); `*.spec.ts` (E2E)
- **E2E helpers**: `kebab-case.ts` in `e2e/helpers/`

### Functions
- **Backend services**: Exported `async function` names in `camelCase` matching the domain action (e.g. `create`, `getAll`, `delete_`, `complete`, `uncomplete`, `adjustPoints`, `getLeaderboard`). The trailing underscore on `delete_` avoids shadowing the `delete` keyword.
- **Backend routes**: Anonymous arrow functions passed to `router.get/post/put/delete`. No named handler exports.
- **Backend middleware**: Named `function` exports (e.g. `authenticate`, `authorize`, `csrfProtection`, `validate`).
- **Frontend hooks**: `usePascalCase` function names (e.g. `useAuth`, `useAssignments`, `useMyPoints`).
- **Frontend API functions**: `camelCase` named exports (e.g. `getAll`, `create`, `login`, `logout`, `getCurrentUser`, `delete_`).
- **Frontend components**: `PascalCase` named exports (e.g. `DashboardPage`, `ProtectedRoute`, `AppShell`).
- **E2E helpers**: `camelCase` named exports (e.g. `login`, `getCsrfToken`, `goToManageLink`, `logout`).

### Variables
- `camelCase` for all local variables, parameters, and constants.
- `UPPER_SNAKE_CASE` for true constants (e.g. `CSRF_COOKIE`, `CSRF_HEADER`, `TOKEN_LENGTH`, `WEEK_MS`, `MAX_STREAK_WEEKS`, `LEVEL_THRESHOLDS`, `BADGE_CATALOG`, `BADGE_RULES`).
- Test mock data uses descriptive names: `mockUser`, `mockAssignment`, `defaultAssignment`, `defaultUsers`.

### Types / Interfaces
- `PascalCase` for all type names (e.g. `AppError`, `LevelInfo`, `BadgeDef`, `Assignment`, `User`, `AuthContextType`, `ProtectedRouteProps`).

### Components
- `PascalCase` for component names and their file names.
- React function components are exported as named exports (not default), with the sole exception of `App.tsx` which uses `export default`.

### Routes (API)
- Plural nouns for resource collections: `/api/templates`, `/api/assignments`, `/api/users`, `/api/recurring`, `/api/occurrences`, `/api/points`.
- Nested routes for sub-resources: `/api/assignments/:id/complete`, `/api/occurrences/:id/complete`, `/api/points/users/:id`.
- Self-referential routes for profile operations: `/api/users/me/password`, `/api/users/me/color`, `/api/users/me/ntfy-topic`.

### Routes (Frontend)
- Kebab-case URL paths: `/`, `/login`, `/my-chores`, `/recurring-chores`, `/points`, `/calendar`, `/profile`, `/templates`, `/assignments`, `/users`.

---

## Import Patterns

### Relative vs Absolute
- All imports use **relative paths** (e.g. `../services/assignment.service`, `../../config/prisma`).
- No path aliases or absolute imports are configured in either `tsconfig.json`.

### Barrel Exports
- **No barrel files** (`index.ts` barrel re-exports) exist in any source directory. Each file imports directly from the specific module.

### Import Order
- No enforced import order. The consistent observed pattern:
  1. Third-party packages (`react`, `express`, `@tanstack/react-query`)
  2. Internal modules (relative imports)
  3. Type-only imports use `import type { ... }` syntax in frontend code

### Import Style
- **Backend**: `import * as serviceName from '../services/...'` for service modules; named imports for middleware (`import { authenticate } from '../middleware/auth'`).
- **Frontend API layer**: `import { createApiClient } from '../lib/apiClient'` (named).
- **Frontend hooks**: Named imports from API modules and React Query.
- **Frontend pages**: Named imports for hooks, components, and utilities.
- **Test files**: `import` statements placed after `jest.mock()` / `vi.mock()` calls (required by module mocking). The mocked module is imported AFTER the mock declaration.

---

## Error Handling Patterns

### Custom Error Class
- **`AppError`** class in `backend/src/middleware/errorHandler.ts`:
  - Properties: `statusCode: number`, `code?: string`
  - Extends `Error` with `Object.setPrototypeOf(this, AppError.prototype)` for correct `instanceof` checks.
  - Services throw `AppError` with specific HTTP status codes (400, 401, 403, 404, 409).

### Error Throwing
- Backend services throw `AppError` directly: `throw new AppError('Template not found', 404)`.
- Route handlers wrap service calls in `try/catch` and call `next(err)` to delegate to the global error handler.
- Prisma `P2025` (record not found) errors are caught and converted to `AppError(404)` via a helper function `isRecordNotFoundError()`.
- Prisma `P2002` (unique constraint) errors in gamification badge creation are caught and silently ignored (race condition handling).

### Error Response Format
- The global `errorHandler` middleware returns:
  ```json
  { "success": false, "data": null, "error": { "message": "...", "code": "..." } }
  ```
- The `notFoundHandler` returns the same shape with `{ message: "Not found" }`.
- Zod validation errors include a `details` array with `path` and `message` per issue.

### Frontend Error Handling
- `AuthError` class in `frontend/src/api/auth.api.ts` catches 401 responses from `/api/auth/me`.
- `useAuth` hook surfaces errors via React Query's error state.
- `ProtectedRoute` reacts to `AuthError` with statusCode 401 by redirecting to `/login`.
- Pages render error states with "Something went wrong" / "Try again" patterns.
- All API functions unwrap `response.data.data` from the envelope.

---

## API Response Envelope Format

All API responses follow a consistent JSON envelope:

```json
{
  "success": true | false,
  "data": <payload> | null,
  "error": { "message": "...", "code": "..." } | null
}
```

- **Success**: `{ success: true, data: <result>, error: null }`
- **Error**: `{ success: false, data: null, error: { message: "...", code?: "..." } }`
- **Validation error**: `{ success: false, data: null, error: { message: "Validation failed", code: "VALIDATION_ERROR", details: [...] } }`
- **HTTP status codes**: 200 (success), 201 (created), 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 503 (service unavailable)

---

## Middleware Patterns

### Middleware Composition (Backend)
Middleware is composed in `app.ts` using `app.use()` in a specific order:
1. `helmet()` -- security headers
2. `cors()` -- CORS configuration
3. `generalLimiter` -- rate limiting on `/api`
4. `express.json()` + `express.urlencoded()` -- body parsing (10kb limit)
5. `cookieParser()` -- cookie parsing
6. `session()` -- express-session configuration
7. `csrfProtection` -- CSRF double-submit cookie pattern on `/api`
8. Routes (`/api`)
9. `notFoundHandler` -- 404 catch-all
10. `errorHandler` -- global error handler

### Route-Level Middleware
- **`authenticate`**: Session-based auth check; verifies session.userId exists and user is in DB.
- **`authorize(...roles)`**: Factory function returning middleware that checks `req.session.role`.
- **`validate(schema)`**: Zod schema validation middleware; replaces `req.body` with parsed data.
- **`authLimiter`**: Stricter rate limit (10 req/15min) on login endpoint.
- Route handlers compose middleware inline: `router.post('/', authenticate, authorize('PARENT'), validate(schema), handler)`.

### Middleware Skips in Test
- CSRF middleware skips validation when `NODE_ENV === 'test'`.
- Rate limiter middleware skips throttling when `NODE_ENV === 'test'`.

---

## Configuration Patterns

### Environment Variables
- Loaded via `dotenv/config` (imported in `server.ts` and `prisma.ts`).
- Key env vars: `PORT`, `HOST`, `NODE_ENV`, `SESSION_SECRET`, `SESSION_MAX_AGE`, `SAMESITE_POLICY`, `SECURE_COOKIES`, `CORS_ORIGIN`, `DATABASE_URL`, `NTFY_BASE_URL`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`.
- Env vars are read with `process.env.VAR || defaultValue` or `Number(process.env.VAR) || defaultValue` patterns.
- Production guard: `SESSION_SECRET` is required when `NODE_ENV=production` (throws on startup if missing).

### Config Files
- **`backend/src/config/prisma.ts`**: Creates and exports a single `PrismaClient` instance.
- **`backend/src/config/notifications.ts`**: Reads `NTFY_BASE_URL` from env, exports `isNtfyConfigured` boolean and `getNtfyConfig()`.

### Prisma Configuration
- SQLite database (`file:./dev.db`).
- Schema at `backend/prisma/schema.prisma`.
- Seed script at `backend/prisma/seed.ts` (idempotent upserts for 4 users, 4 templates, 4 point logs, 2 recurring chores).
- Prisma client imported as `{ prisma }` from `../config/prisma` throughout services.

---

## Type Patterns

### Interfaces vs Types
- **Interfaces** are used for data shapes (e.g. `User`, `Assignment`, `LevelInfo`, `BadgeDef`, `AuthContextType`, `ProtectedRouteProps`, `ChoreLike`).
- **Type aliases** used for computed types (e.g. `type Stats = Awaited<ReturnType<typeof collectStats>>`).
- **Prisma types**: Not explicitly imported; the Prisma-generated types are used implicitly.

### Where Types Live
- **Frontend API types**: Defined inline in `frontend/src/api/*.ts` files (e.g. `Assignment`, `User`, `Template` interfaces in their respective API modules).
- **Backend types**: Minimal; mostly inline type annotations. `AppError` class is the only custom type exported. Session augmentation in `backend/src/types/express-session.d.ts`.
- **Shared types**: None. Frontend and backend are fully independent packages; types are not shared.

### Inline vs Imported
- Frontend API response types are defined and exported from API modules, imported by hooks and pages.
- Route handler types are inferred from Express generics (`Request`, `Response`, `NextFunction`).
- Service function parameter types are inline object type annotations (e.g. `create(data: { choreTemplateId: number; assignedToId: number; dueDate: string })`).

---

## Comment Style

### Documentation Comments
- **Minimal JSDoc**: Only 3 JSDoc `/** */` blocks found across the entire codebase (in `e2e/playwright.config.ts` and `e2e/uat-checklist.spec.ts`). No JSDoc on functions, services, or components.

### Inline Comments
- **Extensive inline comments** explaining non-obvious behavior, especially:
  - Why CSRF cookie must be a literal string (CodeQL security scan requirement)
  - Why `createApiClient()` must be used instead of `axios.create()` (CSRF interceptor propagation)
  - Why `delete_` has a trailing underscore (keyword shadowing)
  - Why `lifetimePoints` cache self-heals instead of backfilling via migration
  - Why rate limits are configurable for e2e vs production
  - Security rationale for auth middleware choices
- Comments typically start with `//` and are placed above the code they explain.
- AGENTS.md serves as the primary institutional knowledge document.

---

## Git Conventions

### Commit Messages
Conventional Commits format: `<type>(<scope>): <description>`

**Types used**:
- `feat` -- new feature (e.g. `feat(gamification): cache lifetimePoints on User`)
- `fix` -- bug fix (e.g. `fix: correct paths after moving e2e configs into e2e/`)
- `test` -- test additions/changes (e.g. `test(12-01): add sweep notification tests with RED assertions`)
- `docs` -- documentation (e.g. `docs: rewrite core docs + fix helmet/cors/rate-limit gap`)
- `chore` -- maintenance (e.g. `chore: repository cleanup -- remove dead scaffolds`)
- `verify` -- verification steps (e.g. `verify(10): update verification to passed after human UAT`)
- `transition` -- phase transitions (e.g. `transition(10): phase complete, advancing to phase 11`)

**Scopes**: Numeric phase IDs (e.g. `12`, `12-01`, `11-01`) or feature areas (e.g. `gamification`, `m1`, `m2`). Some commits use `(#PR)` references.

### Branch Naming
- Feature branches follow `gsd/<description>` pattern (e.g. `gsd/phase-12-chore-due-soon-lazy-trigger`).
- Main branch is `main`.

---

## Frontend-Specific Patterns

### Component Patterns
- **Named function components** with named exports (e.g. `export function DashboardPage()`, `export function ProtectedRoute()`).
- **`App.tsx`** is the only default export (`export default App`).
- **No class components** anywhere.
- Components use **hooks** exclusively for state and side effects.
- UI primitives live in `components/ui/` (Button, Card, StatCard, CountUp, EmptyState, Skeleton, Toast, etc.).
- Page-level components live in `pages/` directory.
- Layout wrapper: `AppShell` component provides consistent page layout.
- `ProtectedRoute` wraps child content and handles auth redirects, 403 display, and loading states.

### Hook Patterns
- **Custom hooks** in `hooks/` use React Query (`@tanstack/react-query`) for data fetching.
- Hook files are `.tsx` (not `.ts`) because they sometimes contain JSX via context providers.
- Pattern: `useQuery` for reads, `useMutation` for writes, with `queryClient.invalidateQueries()` on success.
- `useAuth` is a special hook that uses React Context (not just React Query) to provide auth state.
- Each hook returns a shaped object with data, loading states, error states, and mutation functions.
- Query keys follow hierarchical naming: `['auth', 'me']`, `['assignments']`, `['points', 'me']`, `['points', 'leaderboard']`.

### State Management
- **No Redux, Zustand, or MobX**. State is managed via:
  1. **React Query** for server state (all data fetching and caching).
  2. **React Context** for auth state (`AuthProvider` / `useAuth`).
  3. **Local component state** via `useState`/`useMemo` for UI state.
- `QueryClient` configured with `retry: false` and `staleTime: 5 * 60 * 1000` (5 minutes).

### API Layer Pattern
- Each API module in `frontend/src/api/` creates an axios instance via `createApiClient(baseURL)`.
- Functions unwrap `response.data.data` from the envelope.
- Frontend parameter names are simplified (e.g. `userId` instead of `assignedToId`, `templateId` instead of `choreTemplateId`) and mapped in the API layer.
- `AuthError` class is thrown on 401 responses from `getCurrentUser()`.

---

## Backend-Specific Patterns

### Route Definition Pattern
- Each route file creates a `Router()` and attaches handlers.
- Route files are composed in `routes/index.ts` which mounts them under their resource paths.
- Every handler wraps the service call in `try/catch` and calls `next(err)` on failure.
- Parameters extracted from `req.params` with `parseInt(req.params.id, 10)`.
- Session data accessed via `req.session.userId!` and `req.session.role!` (non-null asserted).

### Service Function Pattern
- Services are collections of exported `async function`s (not classes).
- No dependency injection; services import `prisma` directly from `config/prisma.ts`.
- Services throw `AppError` for domain errors.
- Prisma `$transaction` used for multi-step writes (e.g. completing an assignment awards points and creates a PointLog).
- Fire-and-forget operations use `void` prefix (e.g. `void notifyChoreAssigned(enriched)`, `void awardBadges(userId)`).

### Prisma Usage Patterns
- **Select specific fields**: `select: { id: true, name: true, color: true, role: true }` -- never wildcard.
- **Include with select**: Nested includes always specify `select` to avoid leaking sensitive fields (e.g. passwords).
- **Users list hides email and password**: `select: { id: true, name: true, role: true, color: true }`.
- **Transaction pattern**: `prisma.$transaction(async (tx) => { ... })` with the `tx` client for all operations within.
- **Optimistic writes**: Used for notification deduplication (write `dueNotifiedAt` before the async ntfy call).
- **Self-healing caches**: `lifetimePoints` and `streakCount` on `User` table are cached values that re-sync lazily, not via migrations.

### Schema Pattern (Zod)
- Zod schemas in `schemas/*.ts` validate request bodies.
- Only 3 route files use Zod validation: `assignments.routes.ts`, `points.routes.ts`, `templates.routes.ts`.
- Other routes read `req.body` directly with manual validation.
- Schema naming: `createXxxSchema`, `updateXxxSchema`.
- The `validate()` middleware replaces `req.body` with the parsed result.
