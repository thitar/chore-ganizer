# Work Log

Date-ordered log of completed work and in-progress tickets.

## Tips

- Keep descriptions brief (1-2 lines max)
- Always include ticket URL for easy reference
- Update status if work gets blocked or resumed
- Don't duplicate ticket details — link to source of truth
- Clean out very old entries periodically (3+ months)

---

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

- **Status**: Open (pending user review 2026-07-09)
- **Description**: Independent third-pass review of PR #146 (M2 "The Game") by Hermes. Reviewed gamification/csrf/points/auth paths + full 44-file diff. Findings: 2 High (per-completion full stats recompute in `awardBadges`; duplicate streak/lifetime queries in read path — shared root cause: gamification state recomputed from history instead of incrementally cached), 4 Medium (CSRF cookie set on every response; `SESSION_SECRET||'dev-secret'` fallback; fragile per-instance CSRF interceptor; hardcoded LEVEL_THRESHOLDS/BADGE_CATALOG), 3 Low (role-string literals; CSRF disabled in tests = no integration coverage; CodeQL literal-cookie hack). Verified fine: `dueDate` indexed, `GamificationMoments` shows all new badges (prior WR-05 resolved), P2002 handling, streak caching, route layering, schema constraints. Full report: `.planning/reviews/PR146-REVIEW-3.md`.
- **Decision ref**: PR146-REVIEW-3
- **Notes**: Read-only; no code changed. User to review 2026-07-09. Recommend resolving the 2 High items before merge as they set performance precedent for the rest of the project.
