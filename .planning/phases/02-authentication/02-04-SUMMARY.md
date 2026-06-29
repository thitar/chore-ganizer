---
phase: 02-authentication
plan: 04
subsystem: auth
tags: [react-query, tanstack-query, error-handling, react-router]

requires:
  - phase: 02-authentication
    provides: Frontend auth context, login page, protected routes (02-02)

provides:
  - Query cache wipe on logout (prevents cross-user data leaks)
  - staleTime: Infinity on auth query (no refetch on window focus)
  - AuthError class for distinguishing 401 from network errors
  - ProtectedRoute error discrimination (401 → login, network → retry)
  - Dashboard trimmed to name + logout only (points deferred to Phase 5)

affects: [03-chores, 05-points]

tech-stack:
  added: []
  patterns:
    - "queryClient.clear() on logout to prevent cross-user data in single-device family scenario"
    - "staleTime: Infinity + manual invalidation for auth queries"
    - "AuthError extends Error with statusCode for type-safe error discrimination"
    - "instanceof AuthError check in ProtectedRoute to route 401 vs network errors"

key-files:
  created: []
  modified:
    - frontend-v2/src/hooks/useAuth.tsx - staleTime Infinity, queryClient.clear() on logout, error in context
    - frontend-v2/src/api/auth.api.ts - AuthError class, 401 wrapping in getCurrentUser
    - frontend-v2/src/components/ProtectedRoute.tsx - Error discrimination (AuthError vs network)
    - frontend-v2/src/pages/DashboardPage.tsx - Removed points, added Phase 3/5 TODOs
    - frontend-v2/src/__tests__/scaffold.test.tsx - Updated mock to use AuthError
    - frontend-v2/src/App.tsx - React Router v7 future flags

key-decisions:
  - "queryClient.clear() chosen over selective invalidation — single-device family scenario means any cached data from prior user is potentially sensitive; clear-all is correct even as other query domains (chores, points) come online"
  - "staleTime: Infinity with manual invalidation — auth state only changes on login/logout, so window-focus refetch is pure waste"
  - "AuthError serves double duty: back-end for distinguishing 401 in ProtectedRoute, front-end for type-safe instanceof checks without string-matching error messages"

requirements-completed: [AUTH-01, AUTH-02]

duration: 12 min
completed: 2026-05-23
---

# Phase 02 Plan 04: Frontend Auth Hardening Summary

**Four issues from cross-AI review closed: stale query cache on logout, no error type discrimination in ProtectedRoute, dashboard scope creep (points), and suboptimal auth caching — with React Router v7 future flags opted in.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-23T08:20:00Z
- **Completed:** 2026-05-23T08:32:00Z
- **Tasks:** 4 (3 auto + 1 human-verify)
- **Files modified:** 6

## Accomplishments

- Logout now wipes ALL cached React Query data via `queryClient.clear()` — prevents cross-user data leaks when parent logs out and child logs in on same device
- Auth query uses `staleTime: Infinity` — no unnecessary refetch on window focus; only revalidates via explicit `invalidateQueries` on login
- `AuthError` class with `statusCode` enables type-safe error discrimination: `instanceof AuthError && 401` → redirect to login; generic `Error` → "Connection Error" with Retry button
- Dashboard scope trimmed: points display and Star icon removed; `{user?.name}` + logout button only; Phase 3 and Phase 5 TODO comments added for future wiring
- 403 page verified present in ProtectedRoute (confirmed from 02-02)
- React Router v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`) opted in early

## Task Commits

1. **Task 1: Query cache hardening** - `2c578ac` (feat)
2. **Task 2: Error type discrimination** - `25b3cea` (feat)
3. **Task 3: Dashboard scope trim** - `f8bc219` (feat)
4. *React Router v7 future flags* - `67ef5b3` (fix)
5. **Task 4: Human checkpoint** — verified, approved

## Files Modified

- `frontend-v2/src/hooks/useAuth.tsx` — staleTime Infinity, queryClient.clear() in logout onSuccess, error in AuthContextType
- `frontend-v2/src/api/auth.api.ts` — AuthError class, getCurrentUser() 401 wrapping with axios.isAxiosError
- `frontend-v2/src/components/ProtectedRoute.tsx` — Error discrimination: AuthError→login, Error→connection UI, !user defensive fallback
- `frontend-v2/src/pages/DashboardPage.tsx` — Removed points/Star; user name + logout only; Phase 3/5 TODOs
- `frontend-v2/src/__tests__/scaffold.test.tsx` — Updated mock: uses real AuthError from vi.importActual
- `frontend-v2/src/App.tsx` — v7_startTransition + v7_relativeSplatPath future flags

## Decisions Made

- `queryClient.clear()` is the right call for a single-device family app — clearing all cached queries (not just auth) prevents any residual chore/user/point data leaking between users
- `staleTime: Infinity` with `invalidateQueries(['auth'])` on login is the minimal-auth-refetch pattern — no window-focus nonsense, no polling
- `AuthError` uses `axios.isAxiosError()` for safe type narrowing — avoids fragile `error?.response?.status` checks scattered across components

## Deviations from Plan

None — plan executed exactly as written. React Router v7 future flags added per user request during checkpoint (non-breaking opt-in).

## Issues Encountered

None.

## Next Phase Readiness

- Phase 02 (Authentication) is now complete — all 4 plans executed, backend hardened against session fixation/ghost sessions/cookie residue, frontend hardened against stale cache/error blindness/scope creep
- Ready for Phase 03 (Chores — backend CRUD)
- All 28 backend tests + 2 frontend tests pass
- `AUTH-01` and `AUTH-02` requirements marked complete

---
*Phase: 02-authentication*
*Completed: 2026-05-23*
