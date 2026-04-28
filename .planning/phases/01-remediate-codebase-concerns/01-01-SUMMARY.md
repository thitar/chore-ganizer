---
phase: 01-remediate-codebase-concerns
plan: 01
subsystem: security
tags: [express, session, error-handling, production-hardening]

requires:
  - phase: N/A
    provides: Base Express app with session middleware and global error handler

provides:
  - Fatal startup validation ensuring SESSION_SECRET is always present
  - Environment-aware error response sanitization to prevent information leakage
  - DRY getSafeErrorMessage helper for consistent production error handling

affects:
  - 01-02-PLAN.md (CSRF retry loop prevention — relies on same middleware stack)
  - 01-03-PLAN.md (bug fixes — may reference error response shapes)

tech-stack:
  added: []
  patterns:
    - "Fatal startup guards for required environment variables"
    - "Environment-conditional error sanitization (NODE_ENV === 'production')"
    - "Status-code-aware message filtering (5xx sanitized, 4xx preserved)"

key-files:
  created: []
  modified:
    - backend/src/app.ts
    - backend/src/middleware/errorHandler.ts

key-decisions:
  - "Removed development fallback for SESSION_SECRET to enforce uniform security posture across all environments"
  - "Preserved full error details in server-side logs while sanitizing only HTTP responses"
  - "Allowed 4xx error messages in production since they are user-facing and safe"

requirements-completed: []

duration: 7min
completed: 2026-04-28
---

# Phase 1 Plan 01: Security Hardening Summary

**Fatal startup validation for SESSION_SECRET and production-safe error responses without stack trace leakage**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-28T16:28:54Z
- **Completed:** 2026-04-28T16:35:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added explicit fatal startup check for SESSION_SECRET with actionable instructions
- Simplified session secret retrieval by removing now-dead fallback code
- Added `getSafeErrorMessage` helper for DRY, environment-aware error sanitization
- Ensured production 5xx responses return only "Internal server error" without leaking internals
- Preserved full error messages in development for debugging
- Allowed 4xx messages in production since they are user-facing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add startup SESSION_SECRET validation** — `76ade96` (feat)
   - Fix commit for unused import removal — `e28b263` (fix)
2. **Task 2: Sanitize error responses in production** — `27a7bac` (feat)

**Plan metadata:** `TBD` (docs: complete plan)

## Files Created/Modified
- `backend/src/app.ts` — Added fatal SESSION_SECRET validation after `dotenv.config()`; simplified session secret assignment
- `backend/src/middleware/errorHandler.ts` — Added `getSafeErrorMessage` helper; refactored AppError, Prisma, and unknown error handlers to use it

## Decisions Made
- Removed development fallback for SESSION_SECRET because the plan explicitly required the app to refuse to start without it; keeping the fallback would be misleading and contradictory
- Preserved full error details in server-side logs (including stack traces) while sanitizing only the HTTP response body, ensuring debuggability is not compromised

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused `crypto` import after session secret refactor**
- **Found during:** Task 1 (Add startup SESSION_SECRET validation)
- **Issue:** After removing the `getSessionSecret()` fallback that used `crypto.randomBytes`, the `import crypto from 'crypto'` became unused, causing `tsc` to fail with TS6133
- **Fix:** Removed the unused `crypto` import from `backend/src/app.ts`
- **Files modified:** `backend/src/app.ts`
- **Verification:** `npm run build` passes without errors
- **Committed in:** `e28b263`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for build correctness. No scope creep.

## Issues Encountered
- None — plan executed smoothly after the auto-fixed import issue

## Threat Flags

No new threat surface introduced. Changes harden existing trust boundaries without adding new attack vectors.

## Known Stubs

None — all implementations are complete and functional.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Security hardening foundation complete
- Ready for 01-02 (CSRF retry loop prevention) which operates within the same middleware stack
- Error handler sanitization is backward-compatible and will not affect existing test assertions that check 4xx messages

## Self-Check: PASSED

- [x] `backend/src/app.ts` exists and contains SESSION_SECRET validation
- [x] `backend/src/middleware/errorHandler.ts` exists and contains `getSafeErrorMessage`
- [x] Commit `76ade96` exists (Task 1)
- [x] Commit `e28b263` exists (import fix)
- [x] Commit `27a7bac` exists (Task 2)
- [x] Commit `a0bdfa7` exists (plan metadata)

**Verification:** All files present, all commits found in git history, TypeScript build passes.

---
*Phase: 01-remediate-codebase-concerns*
*Completed: 2026-04-28*
