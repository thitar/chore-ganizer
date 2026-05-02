---
phase: 01-remediate-codebase-concerns
plan: 01
subsystem: infra
tags: [npm, security, express, cleanup, dead-code, route-mounting]

# Dependency graph
requires: []
provides:
  - Zero HIGH/CRITICAL npm vulnerabilities in both backend and frontend packages
  - Dead route file (recurring-chores.routes.ts, 394 lines) deleted with zero side effects
  - metricsRoutes consolidated into routes/index.ts — single app.use('/api', routes) pattern in app.ts
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "npm audit fix without --force for safe dependency upgrades"
    - "npm overrides for forced transitive dependency versions (lodash >=4.17.21)"
    - "Single central route mount: app.use('/api', routes) in app.ts"

key-files:
  created: []
  modified:
    - backend/package.json (npm devDep 11.12.1 -> 11.13.0)
    - backend/package-lock.json (npm audit fix updates)
    - frontend/package.json (lodash override added)
    - frontend/package-lock.json (npm audit fix updates)
    - backend/src/routes/index.ts (metricsRoutes import + mount added)
    - backend/src/routes/metrics.routes.ts (route path /metrics -> /)
    - backend/src/app.ts (metricsRoutes import + mount removed)
  deleted:
    - backend/src/routes/recurring-chores.routes.ts (394-line dead file, zero imports)

key-decisions:
  - "Fixed metrics.routes.ts route path from /metrics to / — the prefix is now handled by the mount point in routes/index.ts, preventing double /metrics/metrics path"
  - "Upgraded npm devDep to 11.13.0 to resolve bundled picomatch HIGH vulnerability"

patterns-established:
  - "All route files now mounted exclusively through routes/index.ts with consistent router.use('/prefix', routeModule) pattern"

requirements-completed:
  - DEPS-01
  - TECH-01
  - TECH-06

# Metrics
duration: 9min
completed: 2026-05-02
---

# Phase 01 Plan 01: npm audit fix, dead code deletion, route mounting consolidation

**Zero HIGH vulns across both packages via selective audit fix + overrides; dead 394-line route file deleted; metricsRoutes consolidated into central router for consistent Express route mounting pattern.**

## Performance

- **Duration:** 9min
- **Started:** 2026-05-02T01:10:28Z
- **Completed:** 2026-05-02T01:19:35Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Backend: 6 vulns → 1 moderate (uuid), zero HIGH/CRITICAL — fixed axios, brace-expansion, follow-redirects, nodemailer, and bundled picomatch via npm upgrade
- Frontend: 6 vulns → 0 vulns — fixed axios, brace-expansion, follow-redirects, lodash, postcss, vite via `npm audit fix`, plus lodash override for future protection
- Deleted `recurring-chores.routes.ts` (394 lines), verified zero imports and clean build
- Moved metricsRoutes from direct mount in app.ts to routes/index.ts, joining all other route files in the central router
- All test suites pass: backend (241 tests, 17 suites), frontend (195 tests, 18 files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix npm vulnerabilities in both packages** - `3f82a9f` (fix)
2. **Task 2: Delete dead file recurring-chores.routes.ts** - `db42696` (fix)
3. **Task 3: Move metricsRoutes mount from app.ts to routes/index.ts** - `bd8d44e` (refactor)

## Files Created/Modified
- `backend/package.json` - npm devDependency upgraded 11.12.1 → 11.13.0 (fixes bundled picomatch HIGH)
- `backend/package-lock.json` - Audit fix: axios, brace-expansion, follow-redirects, nodemailer updated
- `frontend/package.json` - Added `"lodash": ">=4.17.21"` to overrides block
- `frontend/package-lock.json` - Audit fix: all 6 vulnerabilities resolved
- `backend/src/routes/index.ts` - Added `import metricsRoutes` and `router.use('/metrics', metricsRoutes)`
- `backend/src/routes/metrics.routes.ts` - Changed `router.get('/metrics')` → `router.get('/')` (prefix now handled by mount)
- `backend/src/app.ts` - Removed metricsRoutes import and `app.use('/api', metricsRoutes)` mount
- `backend/src/routes/recurring-chores.routes.ts` - **DELETED** (394-line dead file, zero imports)

## Decisions Made
- Metrics route path changed from `/metrics` to `/` in the route file because the `/metrics` prefix is now provided by `router.use('/metrics', metricsRoutes)` in routes/index.ts. Without this fix, the Prometheus endpoint would have resolved to `/api/metrics/metrics` instead of `/api/metrics`.
- The metrics health endpoint moved from `/api/health` to `/api/metrics/health` — no code in the codebase references the old path, so this is a safe consolidation.
- Upgraded npm devDependency to 11.13.0 (from 11.12.1) to resolve the bundled picomatch HIGH vulnerability that `npm audit fix` couldn't reach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed metrics route path to prevent double /metrics prefix**
- **Found during:** Task 3 (Move metricsRoutes mount)
- **Issue:** The plan assumed `router.get('/')` in metrics.routes.ts but the actual code had `router.get('/metrics')`. Mounting at `router.use('/metrics', metricsRoutes)` would have created the wrong path: `/api/metrics/metrics`.
- **Fix:** Changed `router.get('/metrics')` to `router.get('/')` in metrics.routes.ts since the `/metrics` prefix is now provided by the mount point.
- **Files modified:** backend/src/routes/metrics.routes.ts
- **Verification:** Build passes, all 241 tests pass, resulting paths verified: `GET /api/metrics` (Prometheus) and `GET /api/metrics/health` (metrics health)
- **Committed in:** bd8d44e (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential path fix for correctness. No scope creep.

## Issues Encountered
- The npm bundled dependencies (brace-expansion@5.0.4, picomatch@4.0.3) within npm@11.12.1 could not be fixed by `npm audit fix` or overrides — resolved by upgrading npm devDependency to 11.13.0.

## User Setup Required

None — no external service configuration required. Dependency updates are applied automatically via `npm install`.

## Next Phase Readiness
- Clean baseline established: zero HIGH vulns, zero dead code, consistent route mounting
- Ready for 01-02 (type safety fixes — TECH-04, BUGS-01/02/03)
- No blockers

---
*Phase: 01-remediate-codebase-concerns*
*Completed: 2026-05-02*
