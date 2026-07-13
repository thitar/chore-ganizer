# Work Log

Date-ordered log of completed work and in-progress tickets.

## Tips

- Keep descriptions brief (1-2 lines max)
- Always include ticket URL for easy reference
- Update status if work gets blocked or resumed
- Don't duplicate ticket details — link to source of truth
- Clean out very old entries periodically (3+ months)

---

### 2026-07-13 — Code review on the above session's diff found a real reliability bug in the new notification wiring; fixed

- **Status**: Completed
- **Description**: A multi-angle code review of the uncommitted diff from the entry below flagged that `assignment.service.ts complete()` and `recurring.service.ts completeOccurrence()` both fetched parent users (`prisma.user.findMany`) **after** their completion transaction had already committed, with no try/catch — a transient DB error there would have surfaced as a 500 to the client for a chore that had, in fact, already completed successfully (points awarded, status persisted). The same block was also duplicated verbatim across both files and blocked the HTTP response on a DB round-trip to feed an otherwise fire-and-forget notification.
- **Fix**: Added `notifyParentsOfChoreCompletion()` to `notification.service.ts` — a single function that does the parent lookup, calls the existing `notifyChoreCompleted()`, and wraps the whole thing in try/catch (`console.warn` on failure, matching `gamification.service.ts`'s `awardBadges` convention). Both call sites now just do `void notifyParentsOfChoreCompletion(...)`, fire-and-forget like the `void awardBadges(...)` call next to it — collapsing the duplication and removing the blocking `await` in one move. Added 2 new tests in `notification.service.test.ts` covering the happy path and the "lookup throws, doesn't propagate" case.
- **Not changed**: the review also flagged that `auth.routes.ts`'s new `validate(loginSchema)` changes the response for an empty/malformed login body from 401 to 400 — judged a correct, intentional side effect of adding real request validation (not a regression), and nothing currently depends on the old status code, so left as-is.
- **Verification**: Backend 258/258 (was 256; +2 new), `tsc --noEmit` clean, `npm run build` clean.
- **URL**: local — `backend/src/services/{notification,assignment,recurring}.service.ts`, `backend/src/__tests__/services/notification.service.test.ts`

### 2026-07-13 — Closed 4 of 6 "surprises for new contributors" from a fresh codebase-analysis pass; documented the other 2 as intentional

- **Status**: Completed
- **Description**: A code-explorer subagent's architectural analysis flagged 6 items under "Surprises for New Contributors." Went through each with the user and closed out per their direction:
  - **Wired `notifyChoreCompleted`** — existed since Phase 9/M2 but was never called. Added it to both completion paths (`assignment.service.complete()`, `recurring.service.completeOccurrence()`), fire-and-forget after the existing `awardBadges()` call, notifying all `PARENT`-role users with an `ntfyTopic` set. Narrowed the function's parameter type (it only ever used `id`/`template`/`dueDate`, never the `assignedTo` field the old shared `AssignmentWithIncludes` type required) so the recurring-occurrence call site didn't need to fabricate a fake `assignedTo`.
  - **Added Zod validation** to `auth.routes.ts` (`loginSchema`), `users.routes.ts` (`createUserSchema`, `updatePasswordSchema`, `updateColorSchema`, `updateNtfyTopicSchema`), and `recurring.routes.ts` (`createRecurringSchema`) — closing `CONCERNS.md` §1.2 and the matching gap called out in `ARCHITECTURE.md`/`AGENTS.md`. `occurrences.routes.ts` correctly still has none — its one route takes no body.
  - **Updated `ARCHITECTURE.md`/`AGENTS.md`** (symlinked as `CLAUDE.md`) to drop the now-stale "4 of 7 route modules have no Zod schema" claim, and added a one-line pointer that recurring *occurrences* are listed/completed via `assignments`/`occurrences` routes, not `/api/recurring`.
  - **Checked the `lifetimePoints`-not-decremented claim** — already correctly resolved and documented as intentional in `CONCERNS.md` §1.1 and this file's 2026-07-12 entry; the "confirmed gap" framing only existed in the subagent's fresh (not-repo-persisted) analysis output, so there was no actual stale doc to fix.
  - **Documented `PARTIALLY_COMPLETE`** (ADR-007) and **in-memory sessions** (ADR-008) in `decisions.md` as explicitly deferred/accepted, per the user's direction — not implemented, just no longer silently unexplained.
- **Verification**: Adding the `notifyChoreCompleted` call surfaced a real test gap — `assignment.service.test.ts` and `recurring.service.test.ts`'s mocked `prisma` objects had no `user.findMany`, so the new call threw `TypeError` mid-test. Added `user: { findMany: jest.fn().mockResolvedValue([]) }` to both files' mocks. Full suite re-run after every step: backend 256/256, frontend 106/106, `tsc --noEmit` clean, `npm run build` clean (both packages).
- **Notes**: This session's env-var-permission friction (from earlier 2026-07-13 entries) didn't recur — no `.env`/`.env.example` files were touched.
- **URL**: local — `backend/src/services/{assignment,recurring,notification}.service.ts`, `backend/src/routes/{auth,users,recurring}.routes.ts`, `backend/src/schemas/{auth,users,recurring}.schema.ts` (new), `docs/ARCHITECTURE.md`, `AGENTS.md`, `docs/project_notes/decisions.md`, `.planning/codebase/CONCERNS.md`

### 2026-07-13 — Live-readiness follow-up: verified the *running* app, found one real live security gap, fixed 5 real bugs

- **Status**: Completed — live rate-limit gap fixed (backend restarted), code fixes committed; one `SECURE_COOKIES` decision + a deploy step still deferred to user (written up in `LIVE-READINESS-2026-07-13.md`)
- **Description**: User asked for a full analysis of whether the app is OK for live homelab family use, with any bugs fixed outright and any open decisions written to a file (user unavailable to answer interactively this session). Rather than re-deriving yesterday's `CONCERNS.md` audit from scratch, verified its conclusions still hold against the *actually running* containers (`docker compose ps`, `printenv`, `curl`, 24h of logs) rather than just re-reading docs:
  - **Confirmed live**: app has 13h+ uptime, healthy, DB connected (8 real users), zero error-log churn since. All 24h-old error-log entries traced to yesterday's own documented UAT/reseed maintenance session, not a new problem.
  - **New finding**: the app is reverse-proxied through Caddy on the public internet at `chore.thitar.ovh`, not LAN-only as the prior audit assumed (confirmed via `curl -I`, saw HSTS+preload headers, `via: Caddy`). This changes the risk calculus on rate limiting.
  - **Live gap found and fixed**: `docker compose exec backend printenv` showed `RATE_LIMIT_MAX=1000`/`AUTH_RATE_LIMIT_MAX=500` live, even though `.env` itself already had the correct `10` — the container had simply never been restarted since `.env` was corrected. User caught the discrepancy (`.env` says 10, tool reported 500) and asked me to check free RAM rather than assume, and to restart if it was a stale-instance issue — it was. Restarted (`docker compose up -d --force-recreate backend`); verified post-restart env, health, and DB integrity (8 users, no data loss).
  - **Remaining decision (not auto-applied)**: `SECURE_COOKIES=false` in production despite HTTPS-only + HSTS — real hardening opportunity, but flipping it blind risks silently breaking login for everyone if Caddy isn't forwarding `X-Forwarded-Proto` to satisfy `express-session`'s `trust proxy` check. Written up with a verify-immediately-after warning in `LIVE-READINESS-2026-07-13.md`.
  - **Fixed, staged (needs `docker compose up -d --build backend frontend` to go live)**: broken favicon (`frontend/index.html`/`favicon.svg` — Vite-template leftover causing a 404 on every page load); added `unhandledRejection`/`uncaughtException` logging to `backend/src/server.ts` (log-then-`exit(1)`, behavior-preserving, just adds diagnostics before Node's existing default crash — `restart: unless-stopped` already covers the restart).
  - **Fixed, test/CI-hygiene only (zero live impact)**: 2 stale `users.test.ts`/`assignments.test.ts` assertions expecting `GET /api/users` to omit `email` (stale since a 2026-07-10 decision, previously logged as a known-but-unfixed gap); a backend test (`assignment.service.test.ts`) and 5 frontend page tests letting real, unmocked network calls escape into the suite (backend: missing `global.fetch` mock; frontend: `AppShell`'s `GamificationMoments` child calls `useGamification()`, which none of `AssignmentsPage`/`MyChoresPage`/`CalendarPage`/`RecurringChoresPage`/`UsersPage`'s tests mocked). Moved a deprecated `ts-jest` `isolatedModules` transform option into `tsconfig.json` proper (verified via full test run + `tsc --noEmit` + `npm run build`, since it changes TS's compile mode project-wide).
  - **e2e/UAT re-run**: initially skipped — host had ~630MB free RAM (shared box, ~20 other containers), and `bugs.md` already documents headless Chromium producing false failures under this exact condition. User asked to actually re-check rather than assume it was still tight; RAM had recovered to ~2.8Gi available by the time of the rate-limit fix. Not run this session regardless — no app-code changes needed verifying beyond what the health check + DB integrity check after the restart already covered.
- **Verification**: Backend 256/256, frontend 106/106, both `tsc --noEmit` clean, both `npm run build` clean, all re-run after each fix, not just once at the end.
- **Notes**: This session deliberately did **not** deploy the staged code fixes or edit `.env` — the app is actively serving a real family (8 users), and both actions were judged to need explicit user sign-off (a `.env` value could break login if misapplied; a redeploy interrupts whoever's using the app). All decisions, options, and recommendations are in `LIVE-READINESS-2026-07-13.md` at repo root for bulk review.
- **URL**: local — `LIVE-READINESS-2026-07-13.md`, `docs/project_notes/bugs.md`, `docs/project_notes/key_facts.md`

### 2026-07-12 — Pre-live pass on CONCERNS.md: fixed the UTC/local date bug, clarified the lifetimePoints "bug" wasn't one, reset rate limits

- **Status**: Completed — code fix + docs correction done; one manual `.env` edit left for the user
- **Description**: User asked whether `.planning/codebase/CONCERNS.md` had anything to fix before going live. Triaged the 5 medium items down to what actually mattered for real usage:
  - **Fixed** §4.1 — `assignment.service.ts`'s date-range fallback (used whenever `getAll()` is called with no `from`/`to`, i.e. every default dashboard/assignments load) mixed `now.getFullYear()` (local) with `now.getUTCMonth()` (UTC). Changed to `now.getUTCFullYear()` for consistency with the rest of the function. Real bug: could show the wrong month's chores near a UTC month boundary depending on server timezone.
  - **Reassessed, not fixed** §1.1 — `uncomplete()` not decrementing `User.lifetimePoints`. Traced through `getLifetimePoints()`'s recompute query (`gamification.service.ts`) and found it sums only `amount>0` PointLog entries — meaning `lifetimePoints` is *defined* as monotonic "total ever earned," and the incremental cache already agrees with a full recompute in all cases. Confirmed with the user this is the desired product behavior (undoing a mis-clicked completion shouldn't cost a kid their level) and left the code alone. Corrected `CONCERNS.md`'s §1.1 to stop calling this a bug — decrementing it would have *introduced* a real cache/recompute mismatch that doesn't exist today.
  - **Flagged for manual fix** §7.1-adjacent — `.env` had `AUTH_RATE_LIMIT_MAX=500`/`RATE_LIMIT_MAX=1000`, leftover from raising them for e2e runs (see bugs.md's 2026-07-12 entry). Live login endpoint was effectively unprotected against brute force at that setting. `.env` is outside this session's write permissions, so gave the user the exact lines to paste (`RATE_LIMIT_MAX=300`, `AUTH_RATE_LIMIT_MAX=10`, matching `docker-compose.yml`'s own defaults) with a comment on when it's fine to raise them again.
  - **Found and fixed incidentally**: `backend/node_modules/.prisma` client was stale (missing `lifetimePoints` in its generated types) and `backend/dev.db` was missing the `lifetimePoints` column entirely — `npx prisma generate` + `npx prisma db push` resolved both. This had been silently failing 76 of 256 backend tests (real Prisma errors against the unmocked local dev DB, not the mocked test suite) before my session — confirmed pre-existing via `git stash`, not caused by the date fix.
- **Remaining known gap (not fixed, out of scope this session)**: 2 tests (`users.test.ts`, `assignments.test.ts`) assert `/api/users` responses do NOT have an `email` property — stale since the 2026-07-10 decision to have that endpoint return email addresses. Test assertions never got updated; app behavior is correct and intentional.
- **Notes**: User still needs to hand-edit `.env` (lines 82-83) and restart the backend for the rate-limit fix to take effect.
- **URL**: local — `.planning/codebase/CONCERNS.md`, `backend/src/services/assignment.service.ts`, `.env` (pending)

### 2026-07-12 — Audited all 11 bugs.md entries against current code; all still fixed, no regressions

- **Status**: Completed — verification only, no code changes
- **Description**: Went through every entry in `docs/project_notes/bugs.md` one by one and confirmed each documented fix is still actually in place, rather than trusting the log at face value:
  - CSRF: all 8 `frontend/src/api/*.ts` modules go through `createApiClient()` → `applyCsrfInterceptor()`, no stray `axios.create()`; backend `csrf.ts` still uses the inline `'XSRF-TOKEN'` literal CodeQL requires
  - `.gitignore`'s `/test/` pattern still anchored, `frontend/src/test/setup.ts` still tracked in git, all 4 date-sensitive page tests still use `useFakeTimers`
  - `schema.prisma`: `dueNotifiedAt` appears once each in `ChoreAssignment`/`RecurringOccurrence` (not duplicated within either), `npx prisma validate` passes clean
  - `helmet()`/`cors()`/`generalLimiter` wired in `app.ts`, `authLimiter` wired on `POST /api/auth/login`
  - `assignment.service.test.ts` uses `jest.spyOn()` throughout, no leftover `resetModules`/`doMock`
  - `docker-compose.yml` passes both `NTFY_BASE_URL` and `NTFY_DEFAULT_TOPIC` through to the backend container
  - The 3 environment/ops-only entries (SQLite readonly after host reseed, auth rate-limit counter persisting across Playwright runs, headless Chromium crashing under host memory pressure) have no code-level fix to verify — confirmed they're correctly documented as infra gotchas, not code bugs
  - **UAT `--config` flag — initially waved through on this pass, wrongly.** First check only confirmed the flag string was *present* in `docs/UAT-RESULTS.md`, not that the command actually resolves. A follow-up audit (prompted by a second reviewer's independent read of the same doc) found the literal documented command failed with `does not exist` when run from the repo root — see the amended 2026-07-12 `bugs.md` entry and the `test:e2e:uat` npm script added to fix it for good.
- **Notes**: No other new bugs found. This closes the loop on trusting `bugs.md` as still-accurate rather than assuming past entries stay true forever — and is itself a lesson that "the flag is mentioned in the doc" isn't the same as "the documented command runs," a gap only caught by literally executing it.
- **URL**: local — `docs/project_notes/bugs.md`

### 2026-07-12 — Re-verified the UAT 54/54 claim; caught a doc bug and a host-memory false alarm along the way

- **Status**: Completed — original 54/54 result reproduced and confirmed genuine
- **Description**: Asked to check `UAT-CHECKLIST.md`/`UAT-RESULTS.md` were clean; re-running the suite to confirm the entry below's 54/54 claim exposed two problems, neither of which turned out to be an app regression. See `docs/project_notes/bugs.md`'s two 2026-07-12 entries for full root-cause detail:
  1. The documented re-run command silently targets the wrong app (a stray `:5173` dev server) if `--config playwright.uat.config.ts` is omitted — it was omitted in `docs/UAT-RESULTS.md`, now fixed.
  2. A corrected rerun then failed at login for 3/4 seeded users — traced to host memory pressure (~20 unrelated Docker containers competing for RAM on this shared box), not the app; confirmed by `bob`'s login succeeding and `:3002` serving 200 throughout.
  3. Once memory pressure eased, reran with the corrected command: **54/54 PASS, 2.6 min**, including real ntfy push delivery for 7.2/7.3 — matches and confirms the prior entry's result.
- **Notes**: `docs/UAT-RESULTS.md` now documents the full trail (original run → failed re-verification attempts → confirmed clean rerun) instead of just re-stamping a green that wasn't actually observed this session.
- **URL**: local — `docs/UAT-RESULTS.md`, `docs/project_notes/bugs.md`

### 2026-07-12 — Implemented Section 7 (Notifications) in UAT suite; full UAT run 54/54 PASS

- **Status**: Completed
- **Description**: The `e2e/uat-checklist.spec.ts` suite skipped Section 7 (Notifications). Implemented it as real ntfy push tests (7.0 env check, 7.1 set topic on profile, 7.2 chore-assigned push, 7.3 due-soon push) — verified notifications actually arrive on `chore-dad-1a54lu`. Required infra fixes discovered along the way: (1) `.env` `NTFY_BASE_URL` (renamed from `NTFY_DEFAULT_SERVER_URL`) must be passed to the backend via `docker-compose.yml` env (backend rebuilt); (2) `AUTH_RATE_LIMIT_MAX` raised to 500 — its in-memory counter persists across Playwright runs and exhausts, causing spurious "Invalid email or password"; (3) DB pollution across runs destabilized logins — must reset by deleting the host SQLite file and re-seeding from host (container runtime lacks `ts-node`); data dir must be `chmod 777/666` because container `appuser` is uid 1001 while host user is uid 1000, else "readonly database"; (4) headless Chromium crashes from `canvas-confetti` fixed via `--disable-gpu --disable-software-rasterizer` + `animations: 'disabled'`; toasts auto-dismiss in 3s so tests wait on `[role="status"]`. Final run: 54/54 PASS (~4.0 min). Created `docs/UAT-RESULTS.md` and checked off all items in `docs/UAT-CHECKLIST.md`.
- **URL**: local — `e2e/uat-checklist.spec.ts`, `docs/UAT-RESULTS.md`

### 2026-07-10 — Refreshed the e2e suite for M1/M2, added CSRF coverage, closed two rate-limit/M1 regressions

- **Status**: Completed
- **Description**: Implemented `docs/superpowers/plans/2026-07-09-uat-plan.md`. The `e2e/` Playwright suite predated the entire v3.2.0 milestone and was completely broken against the current app — audited first (ran the full suite cold), found it 100% blocked by two things: (1) the M1 redesign moved parent-only nav links behind a "Manage" dropdown and made logout icon-only, breaking every nav-click helper; (2) far more fundamentally, PR #149's new login rate limiter (10 req/15min) was hit almost immediately since every one of the suite's ~60 tests independently drove the login form. Fixed the root cause with a shared `e2e/auth.setup.ts` that logs in once per seeded user and replays the session via browser storage state (`e2e/helpers/auth.ts`), instead of one login per test. Also found and fixed a second self-inflicted issue: once CSRF-token attachment was fixed on raw `fetch()` calls, a test's explicit logout call started actually succeeding and destroying the shared replayed session for every later test in the suite — removed it, since switching identity via the shared login() (cookie replacement) needs no logout first.
- Also fixed: several stale light-theme-era selectors (`bg-red-50`, `text-gray-600`) left over from before the M1 dark redesign, one hardcoded June-2026 date assumption in `path-a-regression.spec.ts` (same class of bug documented in this file's 2026-07-04 entries, just not caught until July actually arrived), and a cross-test race in `phase-10-uat.spec.ts` (serialized — every test in that file mutates the same shared user's ntfy topic).
- Added `e2e/m1-the-look.spec.ts` (dark theme, TopNav/BottomTabBar, Leaderboard) and `e2e/m2-the-game.spec.ts` — the latter is the first automated coverage that would have caught the PR #146 CSRF-interceptor bug, since backend unit tests bypass CSRF under `NODE_ENV=test` and frontend unit tests mock axios entirely.
- Made `RATE_LIMIT_MAX`/`AUTH_RATE_LIMIT_MAX` configurable via env (defaults unchanged) so a full e2e run's legitimate API volume doesn't collide with PR #149's rate limiting.
- Added `docs/UAT-CHECKLIST.md` for manual click-through verification.
- **Tests**: e2e suite went from 6 passing / 53 failing (cold) to 71/71 passing, confirmed clean across multiple repeat runs.
- **URL**: https://github.com/thitar/chore-ganizer (see docs/superpowers/plans/2026-07-09-uat-plan.md)

### 2026-07-10 — Executed all four post-v3.2.0 implementation plans end-to-end; major cleanup and docs overhaul shipped

- **Status**: Completed — all four plans executed and merged to main via PRs #148–#151
- **Description**: Four-phase marathon session (S301–S304) executed and deployed all deferred post-v3.2.0 work:
  - **PR #148 (Cleanup, commit 365b630)**: Removed backend-v1-archive/ + frontend-v1-archive/ (pre-rewrite scaffolds, ~11k files), plans/ + test-reports/ (old planning debris), unused data/ directory, dead playwright.p311.config.ts, outdated SWAGGER_JSDOC_GUIDE.md. Tree now reflects only v1-rewrite (v3.0.0+) codebase. 291 files deleted, 65k+ lines removed.
  - **PR #149 (Docs Rewrite + helmet/CORS/rate-limit fix, commit bd35489)**: Shipped new ARCHITECTURE.md (system design, domain model, middleware stack, ADRs), OPERATIONS.md (env vars, startup, health/monitoring, troubleshooting, backup procedures, version bumps), refreshed README as lean entry point, trimmed AGENTS.md to agent-facing conventions only, updated CHANGELOG through v3.2.0. **ALSO implemented the helmet/CORS/rate-limit gap**: wired helmet() for security headers, cors() with CORS_ORIGIN support, general API rate limiter (300/15min on /api), and stricter login limiter (10/15min on POST /api/auth/login). All verified live (security headers present, rate-limit headers decrement, login 429s after threshold). Verified all docs against running code line-by-line.
  - **PR #150 (Gamification Cache, commit f072576)**: Shipped lazy self-healing `User.lifetimePoints` cache (mirrors streakCount: nullable `lifetimePointsSyncedAt` sentinel, backfill on first read, no migration script needed). Transaction-wrapped all positive PointLog write sites (assignment.service.complete, recurring.service.completeOccurrence, points.service.adjustPoints) to increment cache atomically. Closes PR #146's deferred performance item. Backend tests: 256 (was 252). Updated docs/project_notes/issues.md to close out the deferred item.
  - **PR #151 (E2E Refresh + docs sync, commit 4e56de3)**: Enhanced rate-limiter configurability via RATE_LIMIT_MAX/AUTH_RATE_LIMIT_MAX env vars (built on PR #149's implementation). Added shared e2e auth setup: e2e/auth.setup.ts logs in once per seeded user (dad/mom/alice/bob), saves storageState; e2e/helpers/auth.ts replays saved cookies instead of re-driving login form per test (fixed auth-limiter DoS where 50+ independent logins hit the 10/15min threshold). Added nav helpers (goToManageLink/logout) for M1's TopNav Manage dropdown. Added CSRF test helper (getCsrfToken). Fixed e2e regressions: stale light-theme selectors (text-gray-600→text-zinc-400), hardcoded June dates (→computed from clock), cross-test race in phase-10 (serialized ntfyTopic mutations). Fixed session-destroying logout bug: PR #149's CSRF fix made logout() actually work; removed explicit logout calls mid-test that were destroying shared session state. Added e2e/m1-the-look.spec.ts (dark theme, TopNav, leaderboard), e2e/m2-the-game.spec.ts (first automated CSRF end-to-end coverage—backend unit tests bypass CSRF under NODE_ENV=test, frontend tests mock axios). Suite: 6 passing/53 failing → 71/71 passing, stable across repeats. Added docs/UAT-CHECKLIST.md for manual click-through verification. Re-verified ARCHITECTURE.md, OPERATIONS.md, AGENTS.md, key_facts.md against current code (app.ts, routes, schema, entrypoint scripts, docker-compose.yml, .github/workflows/) and folded in findings: CI doesn't build/push Docker images (manual local step), HOST + VITE_DEBUG env vars missing from docs, Zod validation only partial (assignments/points/templates; auth/users/recurring/occurrences read req.body with no schema), role/status/type/frequency are plain Strings (no SQLite enums), RecurringOccurrence @@unique idempotency mechanism, session.userId/role typed non-optional but only after authenticate, GET /api/points/leaderboard + /gamification never documented, GamificationMoments/celebrate/ui primitives not mentioned in ARCHITECTURE.
- **Execution**: All four plans completed, all documented issues fixed, all tests green (backend 256, frontend 106, e2e 71/71), all builds clean, all PRs code-reviewed and merged.
- **URL**: https://github.com/thitar/chore-ganizer — commits 365b630 (#148), bd35489 (#149), f072576 (#150), 4e56de3 (#151)

### 2026-07-10 — Closed out the deferred `lifetimePoints` caching item (PR #146 round 3, fix/m2-followups)

- **Status**: Completed
- **Description**: Implemented the `User.lifetimePoints` cache that PR #146's third review and `fix/m2-followups` both deferred, citing "needs a schema migration + backfill against live data, and this project has no migration tooling" as the blocker. Resolved by mirroring the existing `streakCount`/`streakComputedAt` lazy-cache pattern exactly: a nullable `lifetimePointsSyncedAt` sentinel means every existing user's first post-deploy read self-heals from the real `PointLog` history via the same aggregate query as before, then writes the cache back — this self-heal-on-first-read *is* the backfill, no separate script needed. Write paths (`assignment.service.complete`, `recurring.service.completeOccurrence`, `points.service.adjustPoints` — newly transaction-wrapped) increment the cache in the same transaction as the `PointLog` they create, whenever the amount is positive; negative entries (`REVERSED` from uncomplete, negative `ADJUSTMENT`) are deliberately excluded, matching the pre-existing `amount>0` filter semantics.
- **Verification**: Beyond the unit test suite, verified against real data in an isolated scratch clone — seeded a pre-migration DB, generated real `PointLog` history through the actual running app (points adjustment + chore completion), applied the new schema on top of that already-populated DB, then confirmed the backfilled `lifetimePoints` matched an independently-computed Prisma aggregate exactly (60), and that a subsequent chore completion incremented the cache by exactly its point value (65) without recomputing (the `lifetimePointsSyncedAt` timestamp didn't change).
- **Tests**: 256 backend (was 252), 106 frontend, both typecheck clean.
- **URL**: https://github.com/thitar/chore-ganizer (see docs/superpowers/plans/2026-07-09-gamification-lifetime-points-cache.md)

### 2026-07-09 — Chased the three items deferred from PR #146's review round

- **Status**: Completed on `fix/m2-followups` (off `main`, post-v3.2.0)
- **Description**: Addressed all three items logged in the entry below.
  - **`MyChoresPage` duplicate-key bug** — fixed by keying on `` `${type}-${id}` `` instead of raw `.id`. While fixing it, found the identical latent bug in three more pages that render the same merged assignment+occurrence list (`DashboardPage`, `AssignmentsPage`, `CalendarPage` — the last required threading `type` through its `assignmentsByDate` transform, which previously dropped it). Fixed all four consistently. Verified live: recreated the exact id-collision (a `ChoreAssignment` landing on the same id as an existing `RecurringOccurrence`) against an isolated DB and confirmed zero console warnings across all four pages, including after a live completion.
  - **`SESSION_SECRET` fallback** — `backend/src/app.ts` now throws at startup when `NODE_ENV==='production'` and `SESSION_SECRET` is unset, refusing to run on the dev fallback secret. Chose fail-fast over warn-only since a silently-running prod instance on a public dev secret is a real risk, not just a footgun. 3 new tests in `app.test.ts`.
  - **Gamification duplicate queries (High #1/#2)** — did *not* implement full `lifetimePoints` caching on `User` (the "correct" architectural fix Hermes and I both flagged): it requires a schema migration + backfill against a live database with real family data, and this project has no migration tooling (schema-push only) — the risk of a subtle points/level correctness bug outweighed the documented "negligible" performance win. Implemented the safe subset instead: `awardBadges` now short-circuits with one cheap `userBadge.count` check once a user has earned all 8 badges, skipping the full-history stats scan entirely on every future completion for maxed-out accounts — this is the part that genuinely compounds over time, unlike the single indexed `lifetimePoints` aggregate. The read-path duplication between `getGamification` and `evaluateBadges` remains as documented (streak side is already cache-protected; lifetime-points side is one cheap aggregate).
- **Tests**: 251 backend (was 247), 106 frontend, both typecheck clean, both builds clean.
- **URL**: https://github.com/thitar/chore-ganizer (no PR yet — branch `fix/m2-followups`)

### 2026-07-09 — PR #146 third review (Hermes): applied cheap fixes, deferred perf/scope items

- **Status**: Completed the agreed subset; three items deferred (not blocking)
- **Description**: `.planning/reviews/PR146-REVIEW-3.md` raised 9 findings (0 critical, 2 high, 4 medium, 3 low). Verified each before acting — one (Medium #3, "CSRF cookie set on every response") was factually wrong, the code already guards with `if (!token)`. Two (Medium #6 hardcoded game config, Low #7 role-string literals) were judged YAGNI/pre-existing-pattern and skipped. Fixed: consolidated all 7 `frontend/src/api/*.ts` axios instances behind one `createApiClient()` factory (`frontend/src/lib/apiClient.ts`) so the CSRF interceptor can't be forgotten on a new module (was Medium #5); added `backend/src/__tests__/middleware/csrf.test.ts` with real coverage of the 403-rejection logic, since it's fully bypassed under `NODE_ENV=test` in the app (was Low #8); documented the CodeQL literal-cookie-name requirement and the `createApiClient()` rule in `AGENTS.md` (was Low #9).
- **Deferred** (tracked here, not fixed in PR #146):
  - **High #1/#2** — `awardBadges`/`getGamification` each recompute stats independently (no shared per-request cache); the expensive 52-week streak scan is already cache-protected weekly via `streakComputedAt`, so the real duplicate cost today is just one extra indexed `pointLog.aggregate()` per completion — negligible at this app's household scale. Worth revisiting if a future feature builds on top of `awardBadges`/`getGamification` and the redundant computation compounds.
  - **Medium #4** — `SESSION_SECRET || 'dev-secret'` fallback in `backend/src/app.ts` ships silently; pre-existing on `main`, unrelated to this PR's diff. Should fail startup (or at minimum warn loudly) when `NODE_ENV==='production'` and `SESSION_SECRET` is unset.
  - **Duplicate React key in `MyChoresPage`** (found during manual/mobile verification, not part of PR #146's diff) — `frontend/src/pages/MyChoresPage.tsx:136` keys the merged assignment+occurrence list by raw `.id`. `ChoreAssignment` and `RecurringOccurrence` auto-increment independently from 1 in `useAssignments`'s merged list, so any household with both types can hit a real id collision (reproduced by inserting a `ChoreAssignment` that landed on id=1, same as an existing `RecurringOccurrence`) — React logs a duplicate-key warning and list rendering becomes unreliable. Fix: prefix the key by type, e.g. `key={`${assignment.type}-${assignment.id}`}`.
- **URL**: https://github.com/thitar/chore-ganizer/pull/146

### 2026-07-08 — PR #146 review fixes: CSRF interceptor wiring + CodeQL detection

- **Status**: Completed, pushed to `feature/m2-the-game`
- **Description**: Third review pass on PR #146 found the CSRF token was never actually sent by the frontend (axios `create()` instances don't inherit interceptors from the default export — see bugs.md). Fixed by applying the interceptor per-instance. Separately, CodeQL kept flagging the backend CSRF middleware as "missing" despite it being correct; root-caused to CodeQL requiring a literal cookie-name string in `res.cookie()`, not a variable — see bugs.md for both entries. Both CodeQL checks now pass, 240 backend + 106 frontend tests green.
- **URL**: https://github.com/thitar/chore-ganizer/pull/146

### 2026-07-07 — M2 The Game implemented — streaks, levels, badges (Phase 14)

- **Status**: Implementation complete on `feature/m2-the-game`, not yet merged
- **Description**: Weekly streaks (lazy compute, cached on User), levels from lifetime EARNED+BONUS points (10 thresholds), 8-badge catalog + UserBadge table, fire-and-forget ntfy award on chore completion, GET /api/points/gamification endpoint, LevelBar/BadgeGrid/GamificationMoments UI wired into Dashboard/Points/Profile/AppShell. Backend 242 tests passing, frontend 106 tests passing, both typecheck clean, build clean. User directed implementation to proceed inline without subagents, waiving the spec's "plan M2 after kid feedback" gate.

### 2026-07-07 — M1 The Look shipped: PR #142 merged as v3.2.0

- **Status**: Completed
- **Description**: PR #142 squash-merged to main (a4f5b49) after multi-round review. Final review round migrated pages to shared dateFormat util, added aria-expanded/haspopup to BottomTabBar Manage button. Phase 13 complete; Phase 14 (M2 The Game) awaits kid feedback before detailed planning.
- **URL**: https://github.com/thitar/chore-ganizer/pull/142

### 2026-07-05 — M1 The Look — dark redesign + frontend gamification, all pages

- **Status**: Completed
- **Description**: Task 15 cleanup: removed legacy NavBar.tsx and its test, migrated ProtectedRoute.tsx from primary to accent colors, removed legacy primary alias from tailwind.config.js. All frontend (98) and backend (213) tests pass. Build clean.

### 2026-07-04 - v3.1.0 Notifications Milestone: Merge & Verify

- **Status**: Completed
- **Description**: Merged all 4 notification phases (9-12) into main. Resolved 9 merge-conflict files across notification.service, assignment.service, config, tests, and planning docs. Fixed test pollution bug from jest.resetModules.

### 2026-07-03 — Phase 12: Due-Soon Lazy Trigger

- **Status**: Completed
- **Description**: Implemented notifyDueSoon sweep that piggybacks on GET /api/assignments. Conditional prisma.$transaction update prevents concurrent double-fire. sendNtfy returns Promise<boolean>.

### 2026-07-02 — Phase 11: Chore-Assigned Trigger

- **Status**: Completed
- **Description**: Wired notifyChoreAssigned into assignment.service.create. Recipient receives push when chore is assigned to them. Fire-and-forget via void.

### 2026-07-01 — Phase 10: Profile UI + User Topic Route

- **Status**: Completed
- **Description**: Added PUT /api/users/me/ntfy-topic route with Zod validation. Profile page "Notifications" section with topic input and "Generate random topic" helper. Gap closure for navbar link and empty state.

### 2026-06-29 — Phase 9: Notification Foundation

- **Status**: Completed
- **Description**: notification.service.ts, config/notifications.ts, Prisma migration (User.ntfyTopic, dueNotifiedAt fields). Formatters with body/Click helpers. Graceful noop when NTFY_BASE_URL unset.

### 2026-07-08 — Multi-Agent Coding Setup established (Hermes + Claude Code + OpenCode)

- **Status**: Completed
- **Description**: Wired Hermes (lyra.lab) to assist coding on docker.lab via SSH as `hermes`, group `hermes-data` (gid 1002). Two clean zones: `~/dev` (group-shared repos, no move/symlink) and `/var/lib/hermes/shared` (Hermes scratch). Git enabled via `safe.directory` + `core.fileMode=false`. Push/auth split: GitHub SSH (`hermes@docker.lab`, verified) for historical repos, Forgejo HTTPS token for new repos. Adopted Spillwave `project-memory` skill (`docs/project_notes/`) as the shared convention across all three agents; Hermes's own skill made convention-aware. OpenCode wired via `.opencode/instructions.md`. Recorded as ADR-005.
- **Decision ref**: ADR-005
- **Notes**: Mandatory human review before every push remains in force (Hermes preps, Thitar signs off). `reco`/`beacon`/`argus` scaffolded this session; `data` is a subdir of `argus`.

### 2026-07-08 — PR #146 third-pass deep code review (Hermes)

- **Status**: Closed — all findings resolved or explicitly waived by 2026-07-10 (see below; this entry's status field was never updated at the time)
- **Description**: Independent third-pass review of PR #146 (M2 "The Game") by Hermes. Reviewed gamification/csrf/points/auth paths + full 44-file diff. Findings: 2 High (per-completion full stats recompute in `awardBadges`; duplicate streak/lifetime queries in read path — shared root cause: gamification state recomputed from history instead of incrementally cached), 4 Medium (CSRF cookie set on every response; `SESSION_SECRET||'dev-secret'` fallback; fragile per-instance CSRF interceptor; hardcoded LEVEL_THRESHOLDS/BADGE_CATALOG), 3 Low (role-string literals; CSRF disabled in tests = no integration coverage; CodeQL literal-cookie hack). Verified fine: `dueDate` indexed, `GamificationMoments` shows all new badges (prior WR-05 resolved), P2002 handling, streak caching, route layering, schema constraints. Full report: `.planning/reviews/PR146-REVIEW-3.md`.
- **Decision ref**: PR146-REVIEW-3
- **Notes**: Read-only; no code changed. Findings closed out across the entries above it: 2026-07-09 (SESSION_SECRET fail-fast, MyChoresPage duplicate-key, awardBadges short-circuit, apiClient CSRF consolidation, CSRF middleware test coverage, CodeQL literal-cookie doc) and 2026-07-10 (High #1/#2 fully closed via the `lifetimePoints` cache, PR #150). The CSRF-cookie-on-every-response Medium finding was verified factually wrong (code already guards on it). Role-string literals and hardcoded game config were judged YAGNI/pre-existing-pattern and intentionally left as-is.
