# Bug Log

Date-ordered log of bugs and their solutions.

## Tips

- Keep descriptions under 2-3 lines
- Focus on what was learned, not exhaustive details
- Include enough context for future reference
- Always date entries
- Periodically clean out very old entries (6+ months)

---

### 2026-08-26 - Cancelled chore still shows as "Pending" on the calendar

- **Issue**: A chore cancelled from the Overdue page (`POST /api/overdue/cancel` sets `status: 'CANCELLED'`) still rendered as Pending on the calendar.
- **Root Cause**: `CalendarPage.tsx` only special-cased `COMPLETED` — cancelled day-cell pills got no dimmed/struck-through styling, and the day-detail dialog rendered every non-COMPLETED status as "Pending". The calendar API (`GET /api/assignments` → `assignment.service.getAll()`) correctly returns `CANCELLED` rows (no status filter), so this was a pure frontend display gap. Secondary: the cancel mutation in `useOverdue` invalidated `['overdue']`/`['assignments']` but not `['calendar', year, month]`, so the calendar could also show stale data after a cancel.
- **Solution**: `CalendarPage` now renders `CANCELLED` pills dimmed/struck-through (same treatment as completed) and the day-detail dialog uses the shared `StatusBadge` (shows "Cancelled"); `calendar.api.ts`'s `CalendarAssignment.status` union widened to include `CANCELLED`/`PARTIALLY_COMPLETE`. The cancel mutation now also invalidates `['calendar']`. Tests written test-first (+2 `CalendarPage`, +1 `useOverdue` assertion).
- **Prevention**: Any status-aware UI must handle all four statuses (`PENDING`/`COMPLETED`/`CANCELLED`/`PARTIALLY_COMPLETE`) — a binary "is it COMPLETED?" check silently renders cancelled chores as pending. When a mutation changes a record's status, invalidate every query key that renders that status (calendar included), not just the list it originated from.
- **File**: `frontend/src/pages/CalendarPage.tsx`, `frontend/src/api/calendar.api.ts`, `frontend/src/hooks/useOverdue.tsx`

### 2026-08-26 - Parent couldn't complete a child's (overdue) chore — backend 403 behind a UI button that always fails for parents

- **Issue**: A parent clicking "Mark Complete" on a child's overdue chore got a toast "Failed to complete chore."; log showed `POST /api/assignments/30/complete` returning 403 from the `/my-chores` page. `/my-chores` is not role-restricted and `assignment.service.getAll()` returns **all** family chores to a PARENT (`roleFilter = {}`), so the page renders a "Mark Complete" button for every pending chore — including children's — but both completion endpoints rejected anyone who wasn't the assignee
- **Root Cause**: `assignment.service.complete()` (`assignedToId !== userId` → 403) and `recurring.service.completeOccurrence()` enforced assignee-only completion, contradicting the documented intent: `docs/UAT-CHECKLIST.md` item 3.6 ("complete a chore on behalf of a child") and the UAT plan both describe parents completing children's chores, and the e2e spec had been silently working around the ownership check by assigning the chore *to the parent* before completing it (comment "complete endpoint requires ownership")
- **Solution**: Both services now take the caller's `role` and allow a `PARENT` to complete any assignment/occurrence (points still credit the assignee). `POST /api/assignments/:id/complete` and `POST /api/occurrences/:id/complete` pass `req.session.role`. Frontend: added a "Mark Complete" action to `OverdueChoreActions` (used on the Overdue page and the parent dashboard's overdue rows) and to due-today rows on the parent dashboard; `useAssignments` complete mutations now also invalidate the `['overdue']` query so completed chores drop off the overdue list. Backend: +1 unit +1 integration test per service (parent completes child, credits child); frontend: +4 tests. Full suites green (backend 377, frontend 195), both typechecks clean, e2e spec 3.6 updated to genuinely test parent-completes-child (typechecks; not run — needs live app)
- **Prevention**: When a UI action exists for a role, the backend authorization for that action must permit it (or the UI must hide it). Cross-check UAT checklist claims against the actual service authorization, not the e2e spec that may have been written to sidestep them
- **File**: `backend/src/services/assignment.service.ts`, `backend/src/services/recurring.service.ts`, `frontend/src/components/OverdueChoreActions.tsx`, `frontend/src/pages/ParentDashboard.tsx`, `frontend/src/hooks/useAssignments.tsx`

### 2026-08-11 - Favicon 403 in production nginx container (file shipped at mode 0640)

- **Issue**: No tab icon; `curl /favicon.svg` returned HTTP 403 from the running frontend container even though `frontend/public/favicon.svg` exists, `index.html` references it correctly, and the file is present in the image at `/usr/share/nginx/html/favicon.svg`
- **Root Cause**: The built image contained `favicon.svg` at mode `0640` root-owned, while nginx worker processes run as the unprivileged `nginx` user — so the file was unreadable by nginx and every request 403'd. Docker `COPY` preserves the build context's file mode, which can be masked down to `0640` by a restrictive umask/group-shared-repo checkout at build time (local source was `0664`, git blob mode `100644`, so the mode isn't reproducible from git — it's a build-environment artifact)
- **Solution**: Added `RUN chmod -R a+rX /usr/share/nginx/html` to the frontend `Dockerfile` runtime stage, so every static asset is world-readable/descendable regardless of build-context umask. Verified: rebuilt image serves `/favicon.svg` with HTTP 200
- **Prevention**: Never assume the build context's umask yields readable artifacts for the container's runtime user; normalize permissions on the html tree in the Dockerfile. Same class of bug as the `config.js` 644 fix (2026-07-13)
- **File**: `frontend/Dockerfile`

### 2026-08-08 - Playwright `text=` selector engine does not union on a top-level comma; a "fixed" flaky test failed deterministically instead

- **Issue**: PR #199 fixed a genuine race in `e2e/phase-05-uat.spec.ts` Test 13 (asserted on calendar pill text right after the `h2` heading rendered, before the assignments API call painted the pills) by adding `await page.waitForSelector('text=Make Bed, text=Take Out Trash', { timeout: 10000 })` before counting — on the assumption that a comma inside a Playwright selector string unions two conditions the way a CSS selector list (`a, button`) does. Running the fixed test against a live app showed pills clearly rendered on every calendar day in the failure screenshot, yet the test still timed out and failed on every run — not a flake, a new deterministic failure caused by the fix itself
- **Root Cause**: Playwright's `text=` engine does not split its argument on a top-level comma the way the CSS engine does. Verified empirically with a throwaway spec: `page.setContent('<div>Make Bed</div>')` then `page.locator('text=Make Bed, text=Take Out Trash').count()` returns `0`, even though `text=Make Bed` alone matches the same DOM correctly. The comma-joined string is evaluated as one literal `text=` search term (`"Make Bed, text=Take Out Trash"`), which never appears in the DOM, rather than as two OR'd conditions
- **Solution**: Replaced with `locator.or()`, Playwright's actual documented way to wait for either of two locators: `page.locator('text=Make Bed').or(page.locator('text=Take Out Trash')).first().waitFor({ timeout: 10000 })`. Verified against a live-seeded backend/frontend: `Test 12` (legend) and `Test 13` (pills) both passed together across 3 consecutive full runs
- **Prevention**: Never assume CSS selector-list syntax (comma = OR) generalizes to Playwright's non-CSS selector engines (`text=`, `has-text`, etc.) without checking — the comma is only guaranteed to union when every part of the selector is plain CSS. When you need "wait for either of two texts," reach for `locatorA.or(locatorB)` (or `page.locator(':is(sel1, sel2)')` if staying within pure CSS) instead, and verify empirically with `.count()` against known content before trusting a selector actually matches
- **File**: `e2e/phase-05-uat.spec.ts`

### 2026-08-08 - Local dev-server e2e runs on this shared host: port 3010 already held by an unrelated service, and repeated iteration exhausts the login rate limiter fast

- **Issue**: Manually verifying the PR #199 fix (`npx playwright test phase-05-uat`, using `e2e/playwright.config.ts`'s dev-server target, not the Docker UAT config) required bootstrapping a fresh backend. `backend`'s own `npm run dev` on the default `PORT=3010` never actually started a fresh instance — port 3010 was already listening (`curl localhost:3010/api/health` returned 200 immediately), but with `Access-Control-Allow-Origin: https://chore.thitar.ovh:3002`, not `http://localhost:5173` — i.e. some other, already-running backend instance on this shared multi-agent dev box, unrelated to this worktree's fresh DB. Separately, iterating on the fix (multiple full Playwright runs plus manual `curl` logins for debugging) hit `AUTH_RATE_LIMIT_MAX`'s default of 10/15min within a few runs, surfacing as `429`/stuck `auth.setup.ts` logins that looked like a new bug
- **Root Cause**: Neither is an app defect. (1) This host runs a persistent shared backend on 3010 (see `docs/project_notes/bugs.md`'s 2026-07-12 "Headless Chromium Crashes on Memory-Starved Shared Host" entry for the same box's general contention pattern) that `reuseExistingServer: true` in `e2e/playwright.config.ts`'s `webServer` block happily reuses without checking it's actually *this* worktree's app. (2) The rate limiter is exactly the documented behavior in `AGENTS.md`'s Testing Patterns / `docs/OPERATIONS.md`'s `AUTH_RATE_LIMIT_MAX` entry — it's just easy to forget it applies to manual iteration too, not only a single CI run
- **Solution**: For local dev-server e2e work on this host, don't rely on `npm run dev`'s default port — start an isolated backend on a free port (used 3011) with `PORT=3011 CORS_ORIGIN=http://localhost:5173 AUTH_RATE_LIMIT_MAX=1000 DATABASE_URL="file:./dev.db" npm run dev`, temporarily point `frontend/vite.config.ts`'s proxy `target` at that port, run the tests, then revert the vite config (verified `git diff frontend/vite.config.ts` was empty afterward) and kill the temporary backend/frontend processes
- **Prevention**: Before starting a backend dev server for local e2e verification on a shared/persistent host, `curl localhost:<port>/api/health` first and check its CORS origin / uptime — a fast, long-uptime response is a sign it's someone else's already-running instance, not yours. Raise `AUTH_RATE_LIMIT_MAX` up front for any session that will log in more than a handful of times, not just for CI
- **File**: n/a (environment, not code)

### 2026-08-03 - TOCTOU race in overdue cancel could double-apply a penalty; reschedule could target the wrong record

- **Issue**: Two concurrent `POST /api/overdue/cancel` calls (double-click, or a cancel racing a child's completion) could both pass the "is it PENDING?" pre-check and both write a `PENALTY` `PointLog`, double-penalizing the child. Separately, `POST /api/overdue/reschedule` looked up only `ChoreAssignment` by a bare `id` with no `type` — since `ChoreAssignment` and `RecurringOccurrence` are independent autoincrement ID spaces, a recurring occurrence's id would silently reschedule an unrelated assignment instead of erroring.
- **Root Cause**: `cancelAssignment`/`cancelOccurrence` checked `status !== 'PENDING'` via `findUnique` *outside* the transaction, then updated unconditionally by `{ id }` inside it — a classic TOCTOU where the check and the write aren't atomic. `reschedule` never discriminated REGULAR vs RECURRING (the frontend hid the button for RECURRING, but nothing enforced it server-side).
- **Solution**: Switched the in-transaction updates to `updateMany({ where: { id, status: 'PENDING' }, ... })` and throw 409 when the affected count is 0, so the `PointLog` is never written on a lost race; applied the same guard to `reschedule`. Added `type: z.literal('REGULAR')` to `rescheduleOverdueSchema` plus a service-level guard; the frontend sends `type: 'REGULAR'` from the api layer.
- **Prevention**: For any "check-then-mutate" that must not fire twice, make the mutation itself conditional — Prisma `updateMany`/`update` `where` including the guard column and checking the returned count — rather than trusting a pre-transaction read. When two Prisma models share a numeric autoincrement ID space, any route taking a bare `id` must carry a `type` discriminator.
- **File**: `backend/src/services/overdue.service.ts`, `backend/src/schemas/overdue.schema.ts`

### 2026-08-01 - Fresh worktrees/clones: `backend`'s `npm test` hangs instead of failing, because 6 files are real integration tests with no DB bootstrap

- **Issue**: Setting up a fresh git worktree for the dashboard-assign-chore plan (frontend-only change, backend untouched), the worktree skill's baseline `npm test` check hung past its 120s timeout in `backend/`. On the pre-existing `main` checkout (which has a real `.env` and a seeded `backend/prisma/dev.db`, both gitignored — `git status` confirmed `dev.db` untracked), the identical `npx jest` run passes cleanly in ~10s
- **Root Cause**: `AGENTS.md`'s Testing Patterns section states "No integration test suite currently exists" and describes every backend unit test as mocking Prisma inline. That's inaccurate: `src/__tests__/{assignments,recurring,templates,points,users}.test.ts` and `src/routes/__tests__/auth.routes.test.ts` import the real `app` and real `prisma` client, log in via `supertest` against seeded users (`dad@home.local`, `alice@home.local`, etc.), and query the live DB in `beforeAll`. With no `DATABASE_URL` (no `.env`) and no `prisma db push`/seed run, those Prisma calls fail — but the failure leaves an unbounded connection retry/handle open, so `jest` never exits on its own; it needs `--forceExit` to even report the (expected) 6 failing suites
- **Not fixed — out of scope for the PR that surfaced it** (a frontend-only dashboard change with an explicit backend non-goal): either (a) correct `AGENTS.md`'s Testing Patterns section to acknowledge these 6 files as real integration tests and document the bootstrap (`DATABASE_URL` + `prisma db push` + `prisma db seed`) a fresh worktree/clone/CI runner needs before `npm test` in `backend/` will pass, or (b) refactor those 6 files to mock Prisma like the rest of the suite, matching what the docs already claim is the convention. Either fix belongs in its own PR since it touches test infrastructure, not this feature
- **Prevention**: When bootstrapping a fresh worktree for backend work, don't trust `npm test` to fail fast if something's unconfigured — run it once with `--forceExit` (or `--detectOpenHandles`) first to see whether it's actually hanging on missing DB state before assuming a long-running command is just slow
- **File**: `backend/src/__tests__/{assignments,recurring,templates,points,users}.test.ts`, `backend/src/routes/__tests__/auth.routes.test.ts`, `AGENTS.md`
### 2026-08-01 - AGENTS.md claimed backend tests were fully Prisma-mocked; a real-DB integration suite hangs `jest` in a fresh checkout

- **Issue**: `AGENTS.md`'s Testing Patterns section said "no integration test suite currently exists" and all backend tests mock `config/prisma`. In a fresh worktree with no `DATABASE_URL`/seeded `dev.db`, `npx jest` reported 6 failed suites (77 tests) and then hung past its own "Ran all test suites" line instead of exiting — needed `--forceExit` to get a prompt back
- **Root Cause**: `backend/src/__tests__/{assignments,recurring,templates,points,users}.test.ts` import the real `app` and `prisma` client, log in via `supertest` against seeded users, and query the live DB in `beforeAll`. `auth.routes.test.ts` mocks `services/auth.service` but still routes through the real `authenticate` middleware, which queries Prisma directly — so it needs a DB too, despite looking fully mocked. That's the actual 6-file failing set (verified via `npx jest --forceExit` with `DATABASE_URL` unset). `app.test.ts` looked like a 7th candidate (it `require`s the real app) but Prisma 5's client is lazy — it never validates `DATABASE_URL` unless a query is actually issued, and `app.test.ts` never issues one, so it passes fine without a DB. Running the full suite (not a single file) without `DATABASE_URL` leaves Jest hanging past "Ran all test suites" instead of exiting. `.github/workflows/quality.yml` already bootstraps this correctly for CI (`prisma db push` → `prisma:seed` → `npm test`, all with `DATABASE_URL=file:./dev.db`); the docs just never described that sequence for local/worktree use
- **Solution**: Corrected `AGENTS.md` to describe the real-DB integration suite and document the bootstrap: `npm install`, then `DATABASE_URL="file:./dev.db" npx prisma db push`, then `... npm run prisma:seed`, then `... npm test`, run from `backend/`. Verified: 21/21 suites, 292/292 tests pass in ~10s with this sequence, vs. 6 failing suites + a non-exiting `npx jest` without it. Note `db push`'s `file:./dev.db` resolves relative to `schema.prisma`'s directory, landing at `backend/prisma/dev.db`, not `backend/dev.db`
- **Prevention**: Chose to fix the docs rather than convert these 6 files to mocked Prisma — they're real route+auth+DB coverage, not accidental drift from convention, and CI already relies on the correct bootstrap. When a doc claims "no integration tests" or "file X needs a DB because it does Y," verify against actual `npx jest --forceExit` pass/fail output and the real import chain (including middleware, not just top-level test file imports) rather than trusting the doc or a plausible-looking file diff
- **File**: `AGENTS.md`, `backend/src/__tests__/{assignments,recurring,templates,points,users}.test.ts`, `backend/src/routes/__tests__/auth.routes.test.ts`

### 2026-07-13 - Full env-var audit: VITE_API_URL was dead code, LOG_LEVEL/NTFY_DEFAULT_TOPIC unread, backend/.env's PORT mismatched the frontend proxy target

- **Issue**: User asked to verify every entry in `frontend/.env`/`backend/.env` is actually used by the app, after noticing backend has a separate `.env`/`.env.example` from the root pair. Full grep of `process.env.*`/`import.meta.env`/`window.APP_CONFIG` usage against every documented var turned up several real gaps
- **Findings**:
  - `VITE_API_URL`/`VITE_DEBUG`/`VITE_APP_VERSION` were completely disconnected dead code: the frontend Docker entrypoint generated a `window.APP_CONFIG` object into `/config.js`, and nginx even served it, but no React code anywhere read it — every `frontend/src/api/*.ts` module called `createApiClient()` with a hardcoded relative path instead. Setting `VITE_API_URL` had zero effect on the running app
  - `LOG_LEVEL` and `NTFY_DEFAULT_TOPIC` were passed into the backend container via `docker-compose.yml` (and documented in the root `.env.example`) but never read anywhere in `backend/src` — confirmed via full grep of `process.env.*` call sites
  - `backend/.env` (the real local-dev file, not the example) had `PORT=3000`, but `frontend/vite.config.ts`'s dev-server proxy hardcodes `target: 'http://localhost:3010'` — running the backend locally via `npm run dev` with that value meant every `/api/*` call from the Vite dev frontend silently failed (proxied to nothing on 3010)
  - `backend/.env`'s `SESSION_SECRET=""` had a comment claiming "a random secret will be generated at runtime" — false; `app.ts` falls back to the literal string `'dev-secret'`, not a random one
- **Solution**: Wired `VITE_API_URL` up for real instead of deleting it (user's choice — the mechanism might matter for a future cross-origin setup): `frontend/index.html` now loads `/config.js` before the app bundle, `frontend/public/config.js` provides an empty-string local-dev default (Docker's entrypoint overwrites the same path at container start with real values), and `apiClient.ts`'s `createApiClient()` now prepends `window.APP_CONFIG?.apiUrl` to every relative path. Removed `LOG_LEVEL`/`NTFY_DEFAULT_TOPIC` from `docker-compose.yml` (confirmed dead, safe to drop). Created a missing `frontend/.env.example` (frontend previously had a real `.env` but no template for it)
- **Not fixed — outside this agent's write permissions (any path matching `.env`/`.env.example` is Read-denied by the user's permission settings, which blocks Edit/Write too since those tools require a prior Read)**: `backend/.env`'s `PORT` and stale `SESSION_SECRET` comment, `LOG_LEVEL` line; `backend/.env.example`'s missing `CORS_ORIGIN` documentation; root `.env`/`.env.example`'s `LOG_LEVEL`/`NTFY_DEFAULT_TOPIC` lines. Exact fix text given to the user directly instead
- **Prevention**: When an env var is "documented" (in a `.env.example` or `docker-compose.yml`), that's a claim it's read somewhere — verify with a grep of the actual `process.env.*`/`import.meta.env`/`window.APP_CONFIG` call sites before trusting the docs, especially for a runtime-config mechanism (entrypoint script + nginx template) that's several layers removed from the application code that would need to consume it
- **File**: `docker-compose.yml`, `frontend/index.html`, `frontend/public/config.js`, `frontend/src/lib/apiClient.ts`, `frontend/.env.example` (new), `docs/OPERATIONS.md`

### 2026-07-13 - Two frontend test suites and one backend suite let real network calls escape into unit tests

- **Issue**: `backend/src/__tests__/services/assignment.service.test.ts` produced a `Cannot log after tests are done` warning; `frontend`'s vitest run logged bare `AggregateError` output between test files with no attributable failing test
- **Root Cause (backend)**: The file mocked `isNtfyConfigured: true` but never mocked `global.fetch`. One test's mock data included a real `ntfyTopic`, so `create()`'s fire-and-forget `notifyChoreAssigned` actually called `fetch('https://ntfy.example.com/...')`, which failed after the test had already finished and torn down
- **Root Cause (frontend)**: 5 page test files (`AssignmentsPage`, `MyChoresPage`, `CalendarPage`, `RecurringChoresPage`, `UsersPage`) mocked every hook their page component uses directly, but not `usePoints`/`useGamification`. Every page renders `AppShell`, which unconditionally mounts `GamificationMoments`, which calls `useGamification()` — an unmocked real axios call fired on every render of these 5 suites
- **Solution**: Added a file-level `jest.spyOn(global, 'fetch').mockResolvedValue(new Response())` to the backend file's `beforeEach`; added the missing `vi.mock('../hooks/usePoints', ...)` (returning `{ data: undefined }` for `useGamification`, which `GamificationMoments` already early-returns on) to all 5 frontend files
- **Prevention**: When a test mocks "the feature flag that turns a side effect on" (`isNtfyConfigured`, or any hook a shared layout component calls), also mock or verify every network-capable call site that flag gates — a component-under-test's *ancestors* (shared layout, `AppShell`) can fire calls the test never intended to exercise. Grep hooks used by `AppShell`'s children before writing a new page test rather than assuming "I mocked everything the page imports directly"
- **File**: `backend/src/__tests__/services/assignment.service.test.ts`, `frontend/src/__tests__/{AssignmentsPage,MyChoresPage,CalendarPage,RecurringChoresPage,UsersPage}.test.tsx`

### 2026-07-13 - Two stale `users.test.ts`/`assignments.test.ts` assertions were still failing every `npm test` run

- **Issue**: `npm test` in `backend/` reliably failed 2/256 tests: `expect(u).not.toHaveProperty('email')`
- **Root Cause**: A 2026-07-10 decision made `GET /api/users` intentionally return `email`, but these two test assertions (written before that decision) were never updated — a gap noted but explicitly left unfixed in a 2026-07-12 session ("out of scope this session")
- **Solution**: Changed both assertions to `expect(u).toHaveProperty('email')`, matching the intentional, correct behavior
- **Prevention**: A previously-logged "known gap, not fixed" item is still a real failing test in the meantime — don't let "documented as known" substitute for "actually fixed" once someone's back in the file
- **File**: `backend/src/__tests__/users.test.ts`, `backend/src/__tests__/assignments.test.ts`

### 2026-07-13 - Broken favicon reference (leftover Vite template asset)

- **Issue**: `frontend/index.html` referenced `/vite.svg`, which was never checked into the repo (no `frontend/public/` directory existed at all) — nginx logged a 404 on every single page load in production (`chore.thitar.ovh`), and browsers showed no tab icon
- **Root Cause**: Default Vite scaffold reference never replaced when the app got its own branding
- **Solution**: Added `frontend/public/favicon.svg` (simple checkmark mark in the app's accent purple `#8B5CF6`), updated the `<link rel="icon">` href
- **File**: `frontend/index.html`, `frontend/public/favicon.svg`

### 2026-07-13 - Backend container was running stale rate-limit values; `.env` was already correct

- **Issue**: `docker compose exec backend printenv` showed `RATE_LIMIT_MAX=1000`/`AUTH_RATE_LIMIT_MAX=500` live, while `.env` itself already had the safe values (`AUTH_RATE_LIMIT_MAX=10`) — the running container was just never restarted after `.env` was corrected
- **Root Cause**: Env vars are read once at process start; editing `.env` has zero effect on an already-running container until it's recreated. A prior session's manual `.env` fix silently didn't take effect for this reason
- **Context that raised the stakes while diagnosing**: `curl -I https://chore.thitar.ovh` confirms this app is reverse-proxied through Caddy and reachable on the **public internet**, not LAN-only as the original `CONCERNS.md` audit assumed. At `500`/15min, the login endpoint was effectively unprotected against brute-forcing from anywhere
- **Solution**: `docker compose up -d --force-recreate backend`. Verified post-restart: `RATE_LIMIT_MAX=300`, `AUTH_RATE_LIMIT_MAX=10`, health check green, DB intact (8 users, no data loss)
- **Prevention**: After any `.env` edit that a live container needs to pick up, the fix isn't complete until you *also* confirm via `docker compose exec <service> printenv` that the running process reflects it — a `.env` file matching your intent is necessary but not sufficient
- **File**: `.env`, `docker-compose.yml`

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

