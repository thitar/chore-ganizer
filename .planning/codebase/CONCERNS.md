# CONCERNS.md -- Technical Debt and Issues

> Generated: 2026-07-12
> Codebase snapshot: v3.2.0 (backend/frontend)

---

## 1. Tech Debt

### 1.1 ~~`uncomplete()` Does Not Decrement `lifetimePoints` Cache~~ — Reassessed 2026-07-12: not a bug, working as designed
- **File:** `backend/src/services/assignment.service.ts:188-221`
- **Severity:** None — confirmed self-consistent
- **Detail:** `complete()` increments `User.lifetimePoints`; `uncomplete()` creates a `REVERSED` PointLog entry but doesn't decrement it. This was originally flagged as cache drift. On closer inspection: `getLifetimePoints()`'s backfill/recompute query (`gamification.service.ts`) sums PointLog entries with `amount: { gt: 0 }` only — i.e. `lifetimePoints` is *defined* as "total points ever earned," not net balance. Since `uncomplete()`'s reversal is a negative entry and never deletes the original positive `EARNED` entry, a fresh recompute would never subtract it either — the incremental cache and a full recompute always agree. There is no drift.
- **Decision (2026-07-12, user-confirmed):** Keep this monotonic "total ever earned" semantic intentionally — undoing a mis-clicked completion or a negative points adjustment should not take away a kid's level progress. Matches ADR-006's stated trade-off exactly. **Do not decrement `lifetimePoints` on `uncomplete()` or negative `adjustPoints()` calls** — doing so would require also removing the `amount>0` filter from the recompute query, or the two would start disagreeing (a real bug that doesn't exist today).

### 1.2 ~~No Zod Validation on 4 of 7 Route Modules~~ — Resolved 2026-07-13
- **Files:** `backend/src/routes/auth.routes.ts`, `users.routes.ts`, `recurring.routes.ts`
- **Severity:** Was Low -- service-layer validation already caught malformed input
- **Detail:** `auth`, `users`, and `recurring` routes now run Zod `validate(schema)` (`backend/src/schemas/auth.schema.ts`, `users.schema.ts`, `recurring.schema.ts`), matching `assignments`/`points`/`templates`. `occurrences.routes.ts` still has no schema, correctly -- its one route (`POST /:id/complete`) takes no request body, only a URL param, so there is nothing to validate. Service-layer checks (e.g. `users.service.ts`'s inline regex) are unchanged and still run after Zod's shape check.
- **Impact:** Error envelope is now consistent (`400 VALIDATION_ERROR` on malformed shape) across all body-bearing routes.

### 1.3 Duplicate `isRecordNotFoundError()` Helper
- **Files:** `backend/src/services/assignment.service.ts:288-295` and `backend/src/services/template.service.ts:60-66`
- **Severity:** Low -- code smell
- **Detail:** Identical private helper function copy-pasted in two service files.
- **Fix:** Extract to a shared util (e.g., `utils/prisma.ts`).

### 1.4 `currentMonthDates()` Duplicated Across Pages
- **Files:** `frontend/src/pages/AssignmentsPage.tsx:19-25` and `frontend/src/pages/MyChoresPage.tsx:17-23`
- **Severity:** Low -- code smell
- **Detail:** Identical function copy-pasted in two page components.
- **Fix:** Extract to `utils/dateFormat.ts` or similar.

### 1.5 Hardcoded Gamification Config
- **File:** `backend/src/services/gamification.service.ts:5, 139-148`
- **Severity:** Low -- acceptable for homelab
- **Detail:** `LEVEL_THRESHOLDS` and `BADGE_CATALOG` are hardcoded constants. Not configurable via env or DB. Fine for a family app; documented as intentional YAGNI.

### 1.6 Role/Status/Type/Frequency Are Plain Strings, Not Enums
- **Files:** `backend/prisma/schema.prisma` (all models), route handlers
- **Severity:** Low -- acceptable for SQLite
- **Detail:** `role`, `status`, `type`, `frequency` columns are `String` with no DB-level constraint. Prisma schema accepts any string. Validation happens at the service/route layer. SQLite does not support native enums, so this is the pragmatic choice.
- **Risk:** A malformed string could sneak in via a direct DB edit. Low risk for a homelab app.

---

## 2. Security Issues

### 2.1 Sessions Lost on Backend Restart (In-Memory Store)
- **Severity:** Medium -- real friction for family
- **Detail:** `express-session` uses its default `MemoryStore`. When the backend container restarts (Docker update, host reboot, crash), all active sessions are destroyed. Every family member must re-login.
- **Impact:** Annoying but not a data loss risk. For a single-container homelab, a file-based session store (e.g., `session-file-store`) would persist across restarts without adding infra complexity.
- **Mitigation:** Session `rolling: true` keeps sessions alive during use; `maxAge` is 7 days.

### 2.2 No `process.on('unhandledRejection')` Handler
- **Severity:** Low -- swallowed by Node.js default
- **Detail:** `backend/src/server.ts` handles `SIGTERM`/`SIGINT` for graceful shutdown but does not register a handler for `unhandledRejection` or `uncaughtException`. In Node 15+, unhandled rejections terminate the process by default, which is actually the safer behavior. However, a handler that logs the error before exit would aid debugging.
- **Note:** The `void` fire-and-forget pattern on notifications/badges (6 call sites) means unhandled rejections from those async calls won't crash the server, but they also won't be logged anywhere except if the notification service's own `catch` block catches them (which it does for `sendNtfy`, and `awardBadges` wraps in try/catch with `console.warn`).

### 2.3 Seed Password `password123` Used for All Users
- **File:** `backend/prisma/seed.ts:7`
- **Severity:** Low -- expected for dev seed
- **Detail:** All 4 seeded users share the same password. This is fine for development/UAT but should be changed for any real deployment. No guard prevents deploying the seed DB to production.

### 2.4 No Rate Limiting on Password Change Endpoint
- **File:** `backend/src/routes/users.routes.ts:37-45`
- **Severity:** Low -- homelab scale
- **Detail:** `PUT /api/users/me/password` has no rate limiting (unlike login which has `authLimiter`). An attacker with a valid session could brute-force the current password. Mitigated by the session requirement and the general rate limiter (300/15min).

### 2.5 CORS Origin Defaults to `localhost:3002`
- **File:** `backend/src/app.ts:23`
- **Severity:** Low -- production override exists
- **Detail:** `CORS_ORIGIN` defaults to `http://localhost:3002`. In production, this should be overridden via env var. The `docker-compose.yml` does pass `CORS_ORIGIN` from `.env`, so this is just a dev convenience default.

---

## 3. Performance Concerns

### 3.1 `authenticate()` Middleware Queries DB on Every Request
- **File:** `backend/src/middleware/auth.ts:14-17`
- **Severity:** Low -- negligible at household scale
- **Detail:** Every authenticated API call hits `prisma.user.findUnique({ where: { id: req.session.userId } })` to verify the user still exists. For a family app with a few users, this is an indexed primary-key lookup on SQLite -- effectively free. Would matter at scale.

### 3.2 `generateOccurrences()` Runs on Every `GET /api/assignments`
- **File:** `backend/src/services/recurring.service.ts:77-106`, called from `assignment.service.ts:57`
- **Severity:** Low -- acceptable
- **Detail:** Every assignment list request triggers `generateOccurrences()` which scans all recurring chores and checks for missing occurrences. At household scale (a handful of recurring chores, monthly range), this is fast. The idempotent upsert pattern (find existing, create missing) is correct. If recurring chores grow to dozens with daily frequency, this could become noticeable.

### 3.3 `collectStats()` Fetches All Completed Chores for Badge Evaluation
- **File:** `backend/src/services/gamification.service.ts:150-177`
- **Severity:** Low -- short-circuits when all badges earned
- **Detail:** `evaluateBadges()` calls `collectStats()` which fetches all completed assignments AND all completed occurrences (full history) to compute stats. Once all 8 badges are earned, line 201 short-circuits (`if (owned.size >= BADGE_CATALOG.length) return []`). Until then, every chore completion triggers this full scan. At household scale, this is fast.

### 3.4 Frontend Fetches All Assignments for Current Month on Every Page Load
- **File:** `frontend/src/api/assignments.api.ts:29-32`, `frontend/src/hooks/useAssignments.tsx:13-14`
- **Severity:** Low -- acceptable
- **Detail:** The `useAssignments` hook calls `getAll()` with no date params, which defaults to the current month. CalendarPage has its own `useCalendarMonth` hook that passes year/month. The dashboard also uses `useAssignments`. Multiple components independently fetch the same data, relying on React Query deduplication (same queryKey).

---

## 4. Fragile Areas

### 4.1 Mixed Local/UTC Date Methods in `assignment.service.getAll()`
- **File:** `backend/src/services/assignment.service.ts:53-55`
- **Severity:** Medium -- timezone bug
- **Detail:** Line 54: `from = new Date(now.getFullYear(), now.getUTCMonth(), 1)` mixes `getFullYear()` (local time) with `getUTCMonth()` (UTC). If the server runs in a timezone where local date differs from UTC date (e.g., after midnight UTC but before midnight local), the default date range will be wrong -- potentially missing chores or including wrong ones. The other branches (lines 44-51) consistently use UTC methods. This only affects the "no date params" fallback.
- **Impact:** The default month range displayed on the assignments page could be off by one month in edge cases.

### 4.2 Fire-and-Forget `void` Pattern on Async Operations
- **Files:** `assignment.service.ts:35,122,183`, `notification.service.ts:45,63`, `recurring.service.ts:158`
- **Severity:** Low -- errors are caught internally
- **Detail:** Six call sites use `void asyncFunction()` to fire-and-forget. If the async function throws, the rejection is unhandled. However, each of these paths has internal try/catch:
  - `awardBadges()` wraps everything in try/catch with `console.warn`
  - `sendNtfy()` catches fetch errors and returns `false`
  - `notifyChoreAssigned()` calls `void sendNtfy()` which catches internally
  - `notifyDueSoon()` is awaited (not fire-and-forget)
- **Net risk:** Low. The only gap is if `notifyChoreAssigned` itself throws before reaching `sendNtfy` (e.g., from accessing properties on a null object), but the function is simple enough that this is unlikely.

### 4.3 `assignment.service.notifyDueSoon()` Marking Optimistic Before Network Call
- **File:** `backend/src/services/assignment.service.ts:268-279`
- **Severity:** Low -- documented trade-off
- **Detail:** The function updates `dueNotifiedAt` BEFORE sending the ntfy push (optimistic write to prevent duplicate notifications). If the ntfy call fails, the notification is silently lost -- the user won't get a due-today push. This is documented as intentional (preventing double-notification is worse than missing one).

### 4.4 Prisma Client Singleton Without `$disconnect` on Shutdown
- **Files:** `backend/src/config/prisma.ts`, `backend/src/server.ts`
- **Severity:** Low -- Docker handles cleanup
- **Detail:** The Prisma client is a module-level singleton that's never `$disconnect()`ed on shutdown. `server.ts` calls `server.close()` on SIGTERM/SIGINT but doesn't await Prisma cleanup. Docker sends SIGTERM, the process exits, and the OS cleans up the file handle. No real data risk with SQLite.

---

## 5. Missing Infrastructure

### 5.1 No Persistent Session Store
- **Detail:** See Section 2.1. A `session-file-store` or similar would persist sessions across container restarts. Not critical for a family app -- re-login is a minor inconvenience.

### 5.2 No CI/CD Pipeline for Building/Pushing Docker Images
- **Detail:** `.github/workflows/security.yml` only runs CodeQL/audit/gitleaks/semgrep/trivy. No workflow builds or pushes Docker images to `ghcr.io`. Version bumps are a local manual step. This is documented in AGENTS.md and OPERATIONS.md.

### 5.3 No ESLint or Prettier Configuration
- **Detail:** Neither `backend/` nor `frontend/` has lint or format scripts. No CI gating on code style. Acceptable for a solo-developer homelab.

### 5.4 No Integration Test Suite
- **Detail:** No `jest.integration.config.js`, no test database, no `test:integration` npm scripts. All backend tests mock Prisma. A real integration test suite would catch issues like the CSRF interceptor bug (which was only found via manual testing).

### 5.5 No Database Backup Automation
- **Detail:** OPERATIONS.md documents manual backup procedures (`cp` the SQLite file), but no cron job or automated backup exists. Risk of data loss on host disk failure.

### 5.6 No Migration History (Schema-Push Only)
- **Detail:** The project uses `prisma db push` instead of `prisma migrate`. This means no migration history -- schema changes are applied destructively. If a column needs to be renamed or data migrated, there's no migration file to reference. Acceptable for SQLite at this scale.

---

## 6. Dependency Risks

### 6.1 `express@^4.18.2` -- End of Life
- **Detail:** Express 4.x is in maintenance mode. Express 5.x has been released. No immediate security risk, but new features and security patches target v5.
- **Impact:** Low for a homelab app. The upgrade path is non-trivial (breaking changes in error handling, path matching).

### 6.2 `react@^18.2.0` -- Not Yet on React 19
- **Detail:** React 19 is available but the project uses React 18. No security concern; React 19 adoption is still early.

### 6.3 `ts-jest@^29.3.0` with `jest@^30.0.0`
- **Detail:** `ts-jest` v29 is pinned but `jest` is at v30. These should be compatible (ts-jest 29 works with jest 30 per their docs), but the version gap is worth noting. A future `ts-jest` major bump may be needed.

### 6.4 No `npm audit` as a CI Gate
- **Detail:** The security workflow runs `npm audit` but there's no build/test job. If audit finds a critical CVE, there's no automated gate to prevent merging.

---

## 7. Operational Risks

### 7.1 Rate Limiter Counter Persists Across E2E Runs
- **File:** `backend/src/middleware/rateLimiter.ts`
- **Severity:** Medium -- documented in bugs.md
- **Detail:** `express-rate-limit` uses in-memory store. The auth rate limiter (default 10/15min) is shared across all logins from the same IP. A Playwright suite with many logins exhausts the counter. This was root-caused and documented in bugs.md (2026-07-12). Mitigation: restart backend before e2e runs, or use `AUTH_RATE_LIMIT_MAX=500`.

### 7.2 SQLite DB File Ownership Mismatch Between Host and Container
- **Severity:** Medium -- documented in bugs.md
- **Detail:** The container runs as `appuser` (uid 1001), but the host user is uid 1000. Re-seeding the DB from the host creates files owned by uid 1000, which the container can't write to. Documented in bugs.md (2026-07-12). Mitigation: `chmod 777` the data dir after reseeding.

### 7.3 Notification Failures Are Silent
- **File:** `backend/src/services/notification.service.ts:33-35`
- **Severity:** Low -- acceptable
- **Detail:** ntfy push failures are logged to `console.warn` and swallowed. No retry mechanism, no dead-letter queue, no user-visible indicator that a notification failed. For a family app, this is fine -- the chore data itself is always correct; the push is supplementary.

### 7.4 Backend Graceful Shutdown Doesn't Wait for In-Flight Requests
- **File:** `backend/src/server.ts:17-25`
- **Severity:** Low
- **Detail:** `server.close()` stops accepting new connections but the SIGTERM handler doesn't explicitly wait for in-flight requests to complete or for Prisma to disconnect. In practice, Docker's SIGTERM grace period (default 10s) is sufficient for a family app.

---

## 8. Code Smells

### 8.1 `ProfilePage.tsx` Is 447 Lines With Multiple `useState` Maps
- **File:** `frontend/src/pages/ProfilePage.tsx`
- **Severity:** Low -- readable but large
- **Detail:** The component manages password change, color change, own topic edit, and per-family-member topic editing (using `familyEditMap`, `familyValueMap`, `familyErrorMap`, `familyUpdatingMap` state maps). Functional but would benefit from extracting the family topic section into a child component.

### 8.2 Frontend Error Handling Swallows Error Details
- **Files:** All `frontend/src/pages/*.tsx` -- every `catch {}` block
- **Severity:** Low -- acceptable
- **Detail:** Every page component catches errors and replaces them with generic messages like "Failed to save assignment. Please try again." The actual error (status code, server message) is discarded. This is fine for a family app where users don't need to debug HTTP errors, but it makes troubleshooting harder during development.

### 8.3 `assignment.service.ts` Is the Largest Service (295 Lines)
- **File:** `backend/src/services/assignment.service.ts`
- **Severity:** Low -- manageable
- **Detail:** Contains `create`, `getAll`, `update`, `complete`, `uncomplete`, `delete_`, `notifyDueSoon`, and `isRecordNotFoundError`. Could be split into assignment CRUD + notification sweep, but at 295 lines it's still readable.

### 8.4 No Consistent Error Envelope for Service-Layer vs Route-Layer Validation
- **Severity:** Low
- **Detail:** Routes with Zod schemas return `{ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [...] } }`. Routes without Zod schemas rely on service-layer `AppError` which returns `{ success: false, error: { message: '...', code: undefined } }`. The `details` array and `code` field are inconsistent.

---

## Summary

| Category | Critical | Medium | Low |
|----------|----------|--------|-----|
| Tech Debt | 0 | 1 | 5 |
| Security | 0 | 1 | 4 |
| Performance | 0 | 0 | 4 |
| Fragile Areas | 0 | 1 | 3 |
| Missing Infra | 0 | 0 | 6 |
| Dependencies | 0 | 0 | 4 |
| Operational | 0 | 2 | 2 |
| Code Smells | 0 | 0 | 4 |
| **Total** | **0** | **5** | **32** |

**Overall assessment:** The codebase is in good shape for a v3.2.0 homelab app. No critical issues. The medium-severity items (lifetimePoints cache drift on uncomplete, mixed local/UTC dates, in-memory sessions, e2e rate limiter persistence, SQLite ownership) are all documented in the project memory system and have known mitigations. The code is well-structured, consistently formatted, and has solid test coverage (256 backend, 106 frontend, 71 e2e). The project memory system (bugs.md, decisions.md, issues.md) is actively maintained and accurate.
