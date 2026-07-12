---
title: Technical Concerns
last_mapped_commit: HEAD
date: 2026-07-12
---

# Technical Concerns

## Critical

### No CI Pipeline for Tests or Builds
- `.github/workflows/security.yml` runs security scanning only (CodeQL, npm audit, Gitleaks, Semgrep, Trivy)
- No build, test, or lint jobs run on PRs or pushes
- Regressions can ship to main undetected
- No Docker image publishing pipeline — images built/tagged locally

## High

### `lifetimePoints` Cache Drift Risk
- **File:** `backend/src/services/gamification.service.ts`
- Cache is correct ONLY if every positive `PointLog` write site also increments `lifetimePoints` in the same transaction
- Currently 3 write sites: `assignment.service.complete`, `recurring.service.completeOccurrence`, `points.service.adjustPoints`
- If a new code path writes a positive `PointLog` without incrementing the cache, it silently drifts
- No reconciliation job or periodic re-sync exists

### Incomplete Zod Validation
- Only `assignments.routes.ts`, `points.routes.ts`, `templates.routes.ts` use `validate(schema)`
- `auth.routes.ts`, `users.routes.ts`, `recurring.routes.ts`, `occurrences.routes.ts` read `req.body` directly
- No input validation on user creation, password change, color change, ntfy topic change, or recurring chore creation

## Medium

### In-Memory Session Store
- **File:** `backend/src/app.ts` — `express-session` with default `MemoryStore`
- All sessions destroyed on backend restart
- Documented but forces re-login on every deploy
- `express-session` docs explicitly warn against MemoryStore in production

### `parseInt` Without NaN Check on Route Params
- **Files:** `users.routes.ts`, `assignments.routes.ts`, `templates.routes.ts`, `recurring.routes.ts`, `occurrences.routes.ts`, `points.routes.ts`
- Non-numeric ID (e.g., `/api/assignments/abc`) → `NaN` → cryptic 500 from Prisma
- Only `users.routes.ts:69` has an explicit `isNaN` check

### `notifyDueSoon` Side Effect Hidden Inside `getAll`
- **File:** `backend/src/services/assignment.service.ts:122`
- Every `GET /api/assignments` triggers a notification sweep
- Viewing calendar or dashboard can send push notifications
- Side effect hidden inside a "get all" query

### No Structured Logging
- All logging uses `console.log`/`console.warn`/`console.error`
- `LOG_LEVEL` env var passed to container but never read by application code
- No log levels, no structured/JSON logging, no log rotation

### No Lint or Format Tooling
- No ESLint, Prettier, or any code quality tooling configured
- No `npm run lint` or `npm run format` scripts
- Code style enforced only by convention

### Rate Limiter Counter Persists Across Test Runs
- **File:** `backend/src/middleware/rateLimiter.ts`
- In-memory store not reset between Playwright runs
- Cumulative `uiLogin` POSTs exhaust the bucket → spurious "Invalid email or password"
- Must restart backend before a fresh run

### SQLite File Ownership Mismatch
- Container `appuser` = uid 1001, host user = uid 1000
- Re-seeding from host creates file owned by 1000 with mode 644
- Container can't write → "attempt to write a readonly database"
- Workaround: `chmod 777`/`666` (fragile)

### N+1 Pattern in `generateOccurrences`
- **File:** `backend/src/services/recurring.service.ts:77-106`
- For each recurring chore: separate `findMany` + potential `createMany`
- Acceptable at household scale but doesn't scale

### `ts-jest` 29.x vs `jest` 30.x Version Mismatch
- **File:** `backend/package.json`
- `ts-jest` 29.x may not fully support Jest 30.x
- Could cause subtle test runner issues

### Alpine 3.18 End-of-Life
- **File:** `backend/Dockerfile` — `node:20-alpine3.18`
- Alpine 3.18 reached EOL May 2025
- Should upgrade for security patches

## Low

### Duplicated Code

| Pattern | Files |
|---------|-------|
| `isRecordNotFoundError()` | `assignment.service.ts:288`, `template.service.ts:60` |
| `currentMonthDates()` | `AssignmentsPage.tsx:19`, `MyChoresPage.tsx:17` |
| Success timer `useEffect` | 6 page components (Assignments, MyChores, Recurring, Users, Points, Profile) |
| Error page with reload button | 6 page components (Calendar, Assignments, Recurring, Users, Points, MyChores) |

### `window.location.reload()` Instead of `refetch()`
- Multiple pages use `window.location.reload()` as retry mechanism
- Should use React Query's `refetch()` instead

### Magic Numbers
- `LEVEL_THRESHOLDS = [0, 50, 120, 220, 360, 550, 800, 1120, 1520, 2000]` — undocumented game balance
- `MAX_STREAK_WEEKS = 52` — undocumented
- `3000` ms ntfy timeout — undocumented
- `15 * 60 * 1000` rate limit window — not configurable

### Fire-and-Forget `void` Calls Without Error Boundaries
- `notifyChoreAssigned` (assignment.service.ts:35) — no error handling
- `notifyDueSoon` (assignment.service.ts:122) — no error handling
- `awardBadges` (assignment.service.ts:183, recurring.service.ts:158) — errors caught internally
- `sendNtfy` (notification.service.ts:45, 63) — returns false on failure, but callers ignore

### `assignment.service.ts` Is the Largest Service (295 lines)
- `getAll` method (lines 40-124) is 85 lines combining date range, occurrence generation, dual queries, mapping, sorting, AND notification side effect

### ProfilePage Is the Largest Component (447 lines)
- 8+ `useState` hooks with duplicated success-timer `useEffect` patterns

### Password Hashing Cost Factor Hardcoded
- `bcrypt.hash(data.password, 10)` in `users.service.ts`
- Should be configurable via env var

### No Password Complexity Requirements Beyond Length
- Only checks `password.length < 6`
- No uppercase/lowercase/number/special requirements

### `userCount` Exposed in Unauthenticated Health Endpoint
- `GET /api/health` returns `{ db: { connected: true, users: N } }`
- Minor information leakage for a family app

## Dependency Risks

| Risk | Details |
|------|---------|
| `express-session` + MemoryStore | Explicitly warned against for production |
| `ts-jest` 29.x + Jest 30.x | Major version mismatch |
| SQLite as production DB | Single-writer, no network access, limited concurrency |
| Alpine 3.18 EOL | Should upgrade for security patches |
| `zod` 4.x | Newer, less battle-tested than widely-used 3.x |

## Operational Risks

| Risk | Details |
|------|---------|
| Session loss on restart | Every deploy forces all users to re-login |
| No graceful shutdown | No explicit DB connection drain or in-flight request handling |
| No database backup automation | No cron job, no backup verification |
| `LOG_LEVEL` unused | Env var passed but application code ignores it |
