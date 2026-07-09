# Bug Log

Date-ordered log of bugs and their solutions.

## Tips

- Keep descriptions under 2-3 lines
- Focus on what was learned, not exhaustive details
- Include enough context for future reference
- Always date entries
- Periodically clean out very old entries (6+ months)

---

### 2026-07-08 - CSRF Token Never Sent: axios.create() Instances Don't Inherit Default Interceptors

- **Issue**: Backend CSRF middleware (double-submit cookie) would reject every mutating request in any non-test environment, even though the frontend interceptor code looked correct and all tests passed
- **Root Cause**: `frontend/src/lib/csrf.ts` registered its `x-xsrf-token` interceptor on the default `axios` singleton, but every `api/*.ts` module builds its own instance via `axios.create({...})`. Instances from `axios.create()` have an independent interceptor chain — interceptors on the default export never propagate to them. Verified empirically: a fresh `axios.create()` instance has 0 interceptors even after registering one on default `axios`. Tests never caught this because `csrfProtection` middleware short-circuits entirely when `NODE_ENV === 'test'`
- **Solution**: Export `applyCsrfInterceptor(instance)` from `csrf.ts` and call it on each of the 7 created axios instances (`auth.api.ts`, `points.api.ts`, `assignments.api.ts`, `users.api.ts`, `templates.api.ts`, `recurring.api.ts` ×2, `calendar.api.ts`) instead of relying on a side-effect import in `main.tsx`
- **Prevention**: When a codebase creates multiple `axios.create()` instances instead of one shared client, any global interceptor setup must be applied per-instance. Also: CSRF/auth middleware that no-ops under `NODE_ENV=test` creates a blind spot — this class of bug is only caught by running the app for real, not by the test suite
- **File**: `frontend/src/lib/csrf.ts`, all `frontend/src/api/*.ts`

### 2026-07-08 - CodeQL js/missing-token-validation Flags Hand-Rolled CSRF Middleware Despite Being Correct

- **Issue**: CodeQL's `js/missing-token-validation` check kept failing on PR #146 even after adding a working double-submit-cookie CSRF middleware; a previous attempted fix (renaming local variables for clarity) did not resolve it
- **Root Cause**: CodeQL's `MissingCsrfMiddleware.ql` only recognizes custom middleware as CSRF protection if it (a) is a known package (`csurf`, `tiny-csrf`, `lusca`, etc.), or (b) sets a cookie whose name argument is a **literal string** matching `/csrf|xsrf/i`. It does not do constant propagation — passing the cookie name via a `const CSRF_COOKIE = 'XSRF-TOKEN'` variable into `res.cookie(CSRF_COOKIE, ...)` doesn't count, only `res.cookie('XSRF-TOKEN', ...)` inline does
- **Solution**: Inlined the literal `'XSRF-TOKEN'` directly in the `res.cookie()` call in `backend/src/middleware/csrf.ts`, keeping the `CSRF_COOKIE` const for reading the incoming cookie (that side isn't checked by the query)
- **Prevention**: For any custom auth/CSRF middleware going forward, keep the cookie-name argument passed to `res.cookie()` as an inline string literal, not a variable, so CodeQL's static recognition works. Fetched and read the actual `.ql` query source (`github/codeql` on GitHub) rather than guessing — that's the fastest way to resolve "CodeQL keeps flagging this and I don't know why" issues
- **File**: `backend/src/middleware/csrf.ts`

### 2026-07-04 - Frontend Test Suite Silently Broken: gitignored setup.ts + date-rot

- **Issue**: All 10 frontend test files failed to load (`Cannot find module src/test/setup.ts`); after restoring it, 15 tests failed on month assertions
- **Root Cause**: (1) Unanchored `test/` pattern in `.gitignore` ignored `frontend/src/test/`, so `setup.ts` was never committed and vanished from checkouts. (2) CalendarPage/AssignmentsPage/MyChoresPage tests hardcode June 2026 fixtures and assume current month = June — they rotted when July arrived
- **Solution**: Anchored the pattern to `/test/`, restored `setup.ts` from git history (b01a314~1), froze test date to 2026-06-15 via `vi.useFakeTimers({ now, toFake: ['Date'] })` in the three files
- **Prevention**: Anchor gitignore directory patterns with a leading `/`; freeze the clock in any test asserting on "current month/day"; `toFake: ['Date']` only, or userEvent/waitFor hang

### 2026-07-04 - Duplicate dueNotifiedAt Fields Break prisma validate

- **Issue**: `npx prisma validate` failed with 2 errors; next container start would fail (entrypoint runs `prisma db push`)
- **Root Cause**: v3.1.0 notifications merge resolved conflicts by keeping `dueNotifiedAt DateTime?` twice in both `ChoreAssignment` and `RecurringOccurrence`
- **Solution**: Removed the duplicate declaration in each model; `prisma validate` + `prisma generate` + full test suite green
- **Prevention**: After merges touching `schema.prisma`, always run `npx prisma validate` before committing

### 2026-07-04 - jest.resetModules() + jest.doMock() Leaves Stale Mock State

- **Issue**: Tests fail or produce incorrect results when run in a certain order — `isNtfyConfigured` returns `false` for tests that expect it to be `true`
- **Root Cause**: `jest.resetModules()` clears the module registry, but then `jest.doMock()` inside `beforeEach` re-applies mocks only for that test. The hoisted `jest.mock()` factory from the top of the file fails to re-apply after `resetModules()`, leaving subsequent tests in a polluted module state where `config/notifications` exports `isNtfyConfigured = false`
- **Solution**: Replace `jest.resetModules()` + `jest.doMock()` with `jest.spyOn()` on the specific functions that need mocking. Spy-based mocking scopes correctly per-test and doesn't affect the module registry for other tests
- **Prevention**: Never use `jest.resetModules()` when tests share module-level state. Prefer `jest.spyOn()` for isolated mocking. If `resetModules()` is unavoidable, put those tests in a separate file with `jest.isolateModules()`
- **File**: `backend/src/__tests__/services/assignment.service.test.ts`
