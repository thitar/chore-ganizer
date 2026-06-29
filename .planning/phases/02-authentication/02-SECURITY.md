---
phase: 02-authentication
version: 1
last_audit: 2026-05-23
threats_total: 13
threats_closed: 13
threats_open: 0
asvs_level: L1
register_authored_at_plan_time: true
---

# Phase 02: Authentication — Security Threat Verification

## Threat Register

### T-02-01: Spoofing — Credential Bypass
- **Component:** POST /api/auth/login
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** bcrypt password comparison with embedded salt. Generic "Invalid credentials" error prevents user enumeration.
- **Evidence:** `backend-v2/src/services/auth.service.ts` — `bcrypt.compare(password, user.password)`

### T-02-02: Tampering — Session Hijack
- **Component:** Session cookie
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** httpOnly cookie (not JS-accessible), SameSite=lax (blocks cross-site POST), server-side session store. No token in localStorage.
- **Evidence:** `backend-v2/src/app.ts` — session config lines 36-41

### T-02-03: Repudiation — No Audit Logging
- **Component:** Auth actions (login/logout)
- **Disposition:** Accept
- **Status:** CLOSED (Accepted)
- **Rationale:** No audit logging in V1 per REQUIREMENTS.md out-of-scope decisions. Family users on private network with minimal compliance need.
- **Evidence:** REQUIREMENTS.md — "Out of Scope: Audit logging"

### T-02-04: Information Disclosure — Auth Error Details
- **Component:** Auth responses (login, /me)
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Generic "Invalid credentials" message. No field-level error discrimination (e.g., "email not found" vs "password wrong"). No stack traces in production. 401 for /me without session (not revealing user existence).
- **Evidence:** `backend-v2/src/services/auth.service.ts`, `backend-v2/src/middleware/auth.ts`, `backend-v2/src/middleware/errorHandler.ts`

### T-02-05: Denial of Service — Auth Endpoint Abuse
- **Component:** All /api/auth endpoints
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Rate limiter: 100 requests per 15-minute window applied to all /api routes. Brute force login far below practical threshold at family scale.
- **Evidence:** `backend-v2/src/app.ts` — `rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })`

### T-02-06: Elevation of Privilege — Role Bypass
- **Component:** authorize() middleware
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `authorize(...roles)` reads role from `req.session.role` (set at login time from the database role field). Role is never accepted from client input (query params, body, headers). CHILD gets 403 on PARENT-only routes.
- **Evidence:** `backend-v2/src/middleware/auth.ts` — `authorize()` function

### T-02-07: Spoofing — Login Form User Enumeration
- **Component:** Frontend LoginPage
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Frontend shows "Invalid email or password" (same message for both fields). No distinction between wrong email and wrong password. Backend also returns generic 401.
- **Evidence:** `frontend-v2/src/pages/LoginPage.tsx` — error message; `backend-v2/src/services/auth.service.ts` — AppError('Invalid credentials')

### T-02-10: Spoofing — Session Fixation
- **Component:** POST /api/auth/login
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `req.session.regenerate()` called on every successful login. Old session ID is invalidated before new userId/role are written to the fresh session. Each login produces a new session ID.
- **Evidence:** `backend-v2/src/routes/auth.routes.ts` — `req.session.regenerate()` in POST /login handler

### T-02-11: Spoofing — Ghost Session (Deleted User)
- **Component:** authenticate() middleware
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `authenticate` middleware checks `prisma.user.findUnique({ where: { id: req.session.userId } })` against the live database. If the user was deleted (by a parent), the session is destroyed, cookie cleared, and 401 returned — the ghost session cannot be used to access resources.
- **Evidence:** `backend-v2/src/middleware/auth.ts` — `authenticate()` ghost check

### T-02-12: Tampering — Cookie Residue After Logout
- **Component:** POST /api/auth/logout
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `res.clearCookie('connect.sid')` sends Set-Cookie with empty value and past expires date. Browser discards the cookie immediately. Session destroyed server-side.
- **Evidence:** `backend-v2/src/routes/auth.routes.ts` — `res.clearCookie('connect.sid')` in POST /logout

### T-02-13: Tampering — Session Cookie Attributes
- **Component:** app.ts session config
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** httpOnly: true (not accessible via JavaScript), SameSite: 'lax' (blocks CSRF-like cross-site POST while allowing top-level navigation from bookmarks/links). Cookie not sent cross-origin.
- **Evidence:** `backend-v2/src/app.ts` — session cookie configuration

### T-02-14: Information Disclosure — Cross-User Cache Leak
- **Component:** React Query cache on logout
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `queryClient.clear()` in logout mutation's `onSuccess` callback. All cached data (user info, assignments, templates) is wiped. Next user logging in starts with a fresh cache — no stale data survives.
- **Evidence:** `frontend-v2/src/hooks/useAuth.tsx` — `logoutMutation.onSuccess` -> `queryClient.clear()`

### T-02-15: Spoofing — Stale Auth State on Window Focus
- **Component:** Auth query revalidation
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `staleTime: Infinity` on the auth query. Auth state only changes via explicit login/logout mutations — never refetches on window focus, reconnect, or mount. Prevents unnecessary server calls and flicker.
- **Evidence:** `frontend-v2/src/hooks/useAuth.tsx` — `useQuery({ staleTime: Infinity })`

### T-02-16: Denial of Service — Network Errors Triggering Logout
- **Component:** ProtectedRoute error handling
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** ProtectedRoute distinguishes 401 (AuthError) from network errors. 401 → redirect to login. Network errors → show "Connection Error" page with Retry button. Transient backend hiccups don't force re-authentication.
- **Evidence:** `frontend-v2/src/components/ProtectedRoute.tsx` — error discrimination and 403 page

## Security Audit 2026-05-23

| Metric | Count |
|--------|-------|
| Threats total | 13 |
| Closed (mitigated) | 12 |
| Closed (accepted) | 1 |
| Open | 0 |

## Accepted Risks

| Threat | Risk | Rationale | Accepted Date |
|--------|------|-----------|---------------|
| T-02-03 | No audit logging for auth actions | Out of scope per REQUIREMENTS.md. Family users, private network, minimal compliance need. | 2026-05-23 |

---

*Phase: 02-authentication*
*Audited: 2026-05-23*
