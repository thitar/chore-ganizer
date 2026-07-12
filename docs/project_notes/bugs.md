# Bug Log

Date-ordered log of bugs and their solutions.

## Tips

- Keep descriptions under 2-3 lines
- Focus on what was learned, not exhaustive details
- Include enough context for future reference
- Always date entries
- Periodically clean out very old entries (6+ months)

---

### 2026-07-12 - Mixed local/UTC `Date` methods in `getAll()`'s default month range

- **Issue**: `GET /api/assignments` with no `from`/`to` params (the dashboard/assignments-page default) could compute the wrong month boundary near a UTC month rollover
- **Root Cause**: `backend/src/services/assignment.service.ts`'s no-params branch built `from` with `new Date(now.getFullYear(), now.getUTCMonth(), 1)` — local-time year paired with UTC month. Every other branch in the same function used UTC consistently. If local date and UTC date fall in different months (possible for part of each day depending on server timezone), `from` could land in the wrong month
- **Solution**: Changed to `now.getUTCFullYear()` to match the rest of the function
- **Prevention**: When a function has multiple branches building `Date`s, keep the local-vs-UTC choice consistent across all of them — a partially-UTC branch is easy to miss in review since each individual line looks correct in isolation
- **File**: `backend/src/services/assignment.service.ts`

### 2026-07-12 - Stale local `dev.db` + Prisma client silently failed 76 backend tests

- **Issue**: `npm test` in `backend/` showed 76/256 failing with `PrismaClientKnownRequestError: The column main.User.lifetimePoints does not exist in the current database`
- **Root Cause**: 6 of the test files (`app.test.ts`, `points.test.ts`, `templates.test.ts`, `assignments.test.ts`, `recurring.test.ts`, `users.test.ts`) don't mock `config/prisma` and instead hit the real local SQLite file at `DATABASE_URL="file:./dev.db"`. That file predated the `lifetimePoints`/`lifetimePointsSyncedAt` columns being added to `schema.prisma`, and the generated Prisma client (`node_modules/.prisma/client`, `node_modules/@prisma/client`) was correspondingly stale too — neither had been refreshed after the schema changed
- **Solution**: `npx prisma generate` (refreshes client types) then `npx prisma db push` (syncs `dev.db`'s actual columns) — both from `backend/`. Failures dropped from 76 to 2 (the 2 remaining are a separate, genuinely stale test assertion, not this issue)
- **Prevention**: After any `schema.prisma` change, run both `npx prisma generate` and `npx prisma db push` locally, not just before container deploys — the local dev DB and client silently drift otherwise, and the resulting Prisma errors look like real test failures rather than an environment sync problem
- **File**: `backend/dev.db`, `backend/prisma/schema.prisma`

### 2026-07-12 - UAT Suite Silently Targets Wrong App When `--config` Flag Omitted (and the "fix" itself was cwd-dependent and broken)

- **Issue**: Re-running `docs/UAT-RESULTS.md`'s documented "How to re-run" command produced 52/54 passing with 2 odd Chromium-crash/timeout failures — looked like a real regression, but the app hadn't actually been tested. A later audit (same day) found the *documented fix* for this — the exact command string in the doc — didn't actually work from the repo root either.
- **Root Cause (original)**: With `--config` omitted entirely, Playwright falls back to whatever's named exactly `playwright.config.ts` in the current working directory. `e2e/playwright.config.ts` (used for frontend dev-server e2e work) has `baseURL: http://localhost:5173`; a leftover `vite` dev server happened to be running on that port, so the suite silently tested it instead of the Docker deployment on `:3002` — no error, just the wrong target. The 2 failures were artifacts of the wrong config (missing `--disable-gpu`; default 30s timeout too short for a 30s ntfy poll), not app bugs.
- **Root Cause (the doc's own fix, found 2026-07-12 on a later audit)**: The corrected command written into the doc, `--config playwright.uat.config.ts` (no `e2e/` prefix), only resolves if your shell's cwd is already `e2e/` — from the repo root it fails immediately with `Error: .../playwright.uat.config.ts does not exist`. The doc never told the reader to `cd e2e` first, so the "fix" was itself unverified against the instructions' own implied cwd (repo root).
- **Behavior is cwd-dependent, verified 2026-07-12**: `e2e/` configs moved out of the repo root in commit `fbb0bb0`. From the **repo root**, omitting `--config` now fails *loudly* (`Project(s) "chromium" not found` — no fallback config exists there anymore), not silently. From **inside `e2e/`**, omitting `--config` *does* still silently resolve to `e2e/playwright.config.ts` (`:5173`) — Playwright only auto-discovers by exact filename, never falls back to `playwright.uat.config.ts`.
- **Solution**: Added `npm run test:e2e:uat` (`package.json`), pinned to `--config e2e/playwright.uat.config.ts --project=chromium uat-checklist.spec.ts` — verified to work from the repo root regardless of cwd assumptions. `docs/UAT-RESULTS.md`'s re-run instructions now use the script instead of a hand-typed `playwright test` invocation.
- **Prevention**: Don't just check that a doc's command *mentions* the right flag — actually run the literal string from a fresh shell at the cwd the doc implies before trusting it. Prefer a pinned npm script over a documented flag combination for any command whose correctness depends on cwd; scripts can't be pasted with a typo'd relative path the way a doc's code block can.
- **File**: `docs/UAT-RESULTS.md`, `package.json`, `e2e/playwright.uat.config.ts` vs `e2e/playwright.config.ts`

### 2026-07-12 - Headless Chromium Crashes on Memory-Starved Shared Host, Mimics App Regression

- **Issue**: After fixing the `--config` bug above, a corrected rerun still failed — 3 of 4 seeded-user logins crashed Chromium or timed out during `auth.setup.ts`, before any checklist test ran
- **Root Cause**: The dev box runs ~20 unrelated Docker containers (dispatcharr, paperless, portainer, etc.) alongside chore-ganizer; `free -h` showed only ~485Mi available (9.3Gi/9.8Gi used). Not enough headroom for headless Chromium to launch reliably. Confirmed it wasn't an app problem: `bob`'s login (the one that did complete) succeeded, and `curl localhost:3002` returned 200 throughout
- **Solution**: Waited for host memory pressure to ease (freed up other containers), confirmed `free -h` showed several GB available, then reran — 54/54 PASS in 2.6 min, confirming the app itself was never broken
- **Prevention**: If a Playwright run against this app produces bizarre failures (page crashed, random timeouts, especially clustered right after another heavy run), check `free -h` on the host before assuming an app regression — this shared box runs many unrelated services and headless Chromium is memory-hungry
- **File**: n/a (environment, not code)

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

### 2026-07-10 - helmet/CORS/express-rate-limit Gap Closed

- **Issue**: `helmet`, `cors`, `express-rate-limit` were in `backend/package.json` since v1-rewrite but never imported into `app.ts` startup
- **Root Cause**: Accidental gap during rewrite (not a deliberate scope cut — checked v1-rewrite-REQUIREMENTS.md's Out of Scope table; rate limiter is even referenced in the account-lockout exclusion rationale)
- **Solution** (PR #149, commit bd35489):
  - `helmet()` for security headers (HSTS, X-Frame-Options, CSP, etc.)
  - `cors()` with CORS_ORIGIN env support, credentials: true for session+CSRF cookies
  - `generalLimiter` (300 req/15min) on /api for brute-force/abuse protection
  - `authLimiter` (10 req/15min) on POST /api/auth/login as substitute for excluded account-lockout feature
  - Both skip in NODE_ENV=test (matching csrf.ts convention) so supertest suites aren't throttled
- **Enhancement** (PR #151, commit 4e56de3): Made rate limits configurable via RATE_LIMIT_MAX and AUTH_RATE_LIMIT_MAX env vars so e2e suite can raise thresholds without affecting production defaults
- **Verification**: Tested live — security headers present, CORS credentials header set, rate-limit headers decrement, login returns 429 after threshold. Backend typecheck clean.
- **Prevention**: After adding security/middleware packages to package.json, add them to AGENTS.md's startup checklist so future contributors don't miss the wiring step

### 2026-07-04 - jest.resetModules() + jest.doMock() Leaves Stale Mock State

- **Issue**: Tests fail or produce incorrect results when run in a certain order — `isNtfyConfigured` returns `false` for tests that expect it to be `true`
- **Root Cause**: `jest.resetModules()` clears the module registry, but then `jest.doMock()` inside `beforeEach` re-applies mocks only for that test. The hoisted `jest.mock()` factory from the top of the file fails to re-apply after `resetModules()`, leaving subsequent tests in a polluted module state where `config/notifications` exports `isNtfyConfigured = false`
- **Solution**: Replace `jest.resetModules()` + `jest.doMock()` with `jest.spyOn()` on the specific functions that need mocking. Spy-based mocking scopes correctly per-test and doesn't affect the module registry for other tests
- **Prevention**: Never use `jest.resetModules()` when tests share module-level state. Prefer `jest.spyOn()` for isolated mocking. If `resetModules()` is unavoidable, put those tests in a separate file with `jest.isolateModules()`
- **File**: `backend/src/__tests__/services/assignment.service.test.ts`

### 2026-07-12 - Resetting the SQLite DB from host leaves it read-only for the backend container

- **Issue**: After deleting `${DATA_DIR}/chore-ganizer.db` and re-seeding from the host (`cd backend && DATABASE_URL="file:..." npx prisma db seed`), the backend returned `500` on every write with `attempt to write a readonly database`
- **Root Cause**: The container runs the server as `appuser` = **uid 1001**, but the host user is uid 1000. Seeding from the host created the db file owned by uid 1000 with mode 644, so the container (1001) could read but not write. (The container entrypoint's `prisma db push` deliberately can't seed — no `ts-node` in the `--omit=dev` runtime image — so seeding must happen from the host.)
- **Solution**: `sudo chmod 777 ${DATA_DIR} && sudo chmod 666 ${DATA_DIR}/chore-ganizer.db` before starting the suite (world-writable lets both uid 1000 and 1001 read/write). Also had to **restart the backend** afterward — an already-open connection caches the read-only state per connection, so just fixing perms isn't enough; the node process must reopen the db.
- **Prevention**: Any time the DB is deleted/re-seeded from the host, make the data dir world-writable (or `chown` to 1001) and restart the backend container. Don't assume file ownership carries over between host and container UIDs.
- **File**: `docker-compose.yml`, `backend/docker-entrypoint.sh`

### 2026-07-12 - Auth rate-limit counter persists across Playwright runs, then breaks logins

- **Issue**: In later full-suite runs, several tests started failing at `uiLogin` with `Invalid email or password` even though credentials were correct
- **Root Cause**: `AUTH_RATE_LIMIT_MAX` (now 500/15min) is enforced by `express-rate-limit` with an **in-memory** store inside the running backend. The counter is NOT reset between Playwright runs, and every `uiLogin` is a real login POST sharing one bucket keyed by the frontend container IP. Cumulative logins across repeated runs (plus DB pollution) exhaust the budget, and the limiter's 429 gets surfaced as a generic auth failure on the login page.
- **Solution**: Restart the backend (clears the in-memory counter) and reset the DB before a fresh run; keep `AUTH_RATE_LIMIT_MAX` high (500). Watch for "Invalid email or password" clusters in later tests as the tell-tale sign, not a credential bug.
- **Prevention**: Treat the rate limiter as session-scoped to the backend process. Before trusting a "clean" re-run, restart the backend. Consider a Redis/explicit-per-run reset if the suite is run repeatedly in CI.
- **File**: `backend/src/middleware/rateLimiter.ts`

### 2026-07-12 - NTFY_BASE_URL renamed but not passed into the backend container

- **Issue**: Section 7 (notifications) tests couldn't deliver — `isNtfyConfigured` was `false` in the running backend even though `.env` had the URL
- **Root Cause**: The env var was renamed from `NTFY_DEFAULT_SERVER_URL` to `NTFY_BASE_URL`, but `docker-compose.yml` backend `environment` still only passed the old name (or nothing), so the container never received it. `isNtfyConfigured` is evaluated at module import, so merely editing `.env` does nothing until the image is rebuilt/restarted.
- **Solution**: Added `NTFY_BASE_URL=${NTFY_BASE_URL:-}` and `NTFY_DEFAULT_TOPIC=${NTFY_DEFAULT_TOPIC:-}` to the backend `environment` block in `docker-compose.yml`, then `docker compose up --build backend`. Verified with `docker compose exec backend printenv | grep NTFY_BASE_URL`.
- **Prevention**: When renaming an env var the backend reads, grep `docker-compose.yml` (and any other deployment manifest) for the old name and update the passthrough. After any `.env` change that affects a module-level constant, rebuild the backend — don't assume a restart picks it up.
- **File**: `docker-compose.yml`, `backend/src/config/notifications.ts`

