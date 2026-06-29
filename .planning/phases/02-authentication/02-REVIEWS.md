---
phase: 02
reviewers: [claude]
attempted: [claude, opencode, qwen]
skipped: [opencode]  # self (running in OpenCode)
failed: [qwen]  # Qwen OAuth free tier discontinued
reviewed_at: 2026-05-23T17:00:00Z
plans_reviewed:
  - 02-01-PLAN.md
  - 02-02-PLAN.md
---

# Cross-AI Plan Review — Phase 2 (Authentication)

## Claude Review

### Plan 02-01: Backend Auth Service, Middleware, and Routes

#### Summary

A solid, well-scoped backend auth plan that correctly separates concerns across service, middleware, and routes. TDD discipline is appropriate here — auth is the highest-risk component and test-first forces explicit thinking about error paths. The threat model is thorough for the stated V1 scope and correctly accepts the CSRF and audit logging exclusions. The main risks are two security gaps (session fixation, ghost sessions) that are small to fix but non-trivial to discover in production.

#### Strengths

- **TDD-first for auth** is exactly right; bcrypt comparison and error path tests will surface subtle bugs early
- **Generic "Invalid credentials" error** correctly prevents username enumeration
- **`authorize()` reads role from session**, not from request body — eliminates a classic privilege escalation vector
- **Threat model explicitly accepts** audit logging and rate limiting gaps with justification rather than silently skipping them
- **Response envelope** (`{ success, data, error }`) consistent with project convention

#### Concerns

- **[HIGH] No session regeneration after login.** The plan calls `req.session.userId = ...` on an existing session but never calls `req.session.regenerate()` first. This is a textbook session fixation vulnerability: an attacker who can plant a session cookie (e.g., via network interception, even without HTTPS on a homelab LAN) can pre-authenticate. Fix: call `session.regenerate(callback)` before setting `userId` and `role`.

- **[MEDIUM] Ghost session risk.** `authenticate` middleware checks `req.session.userId` exists but never validates the user still exists in the database. If a parent deletes a child account while the child is logged in, the child retains full access until their session expires. For a family app this is low-probability but easy to close: add a lightweight `prisma.user.findUnique` in `authenticate` (can be cached by TanStack Query on the frontend, but the server side should also be defensive).

- **[MEDIUM] Session cookie attributes not specified.** The plan relies on "httpOnly session cookie" and "SameSite=lax" being set somewhere, but doesn't specify *where*. If `express-session` configuration lives in `app.ts` (Phase 1), the reviewer can't verify these are set without cross-referencing. The threat model references them as mitigations — the plan should either confirm they're already in `app.ts` from Phase 1 or add a task to verify.

- **[LOW] `session.destroy()` doesn't clear the cookie.** Calling `session.destroy()` removes the server-side session record, but the browser still holds the cookie. A subsequent request with the same cookie gets a new session (not a leaked session), but some clients/proxies may cache the old cookie. The route should also call `res.clearCookie('connect.sid')` (or whatever the session cookie name is) after destroy.

- **[LOW] bcrypt salt rounds not specified.** Plan says "bcrypt.compare password" but doesn't address what salt rounds were used when passwords were seeded. If the seed script (Phase 1) used a different cost factor than what `auth.service.ts` expects for hashing (if hashing is ever added), tests will fail silently. Explicit alignment between seeder and service is worth a one-line note.

#### Suggestions

- Add `session.regenerate()` call in the `login` route between credential validation and session assignment
- Add `res.clearCookie(...)` in logout route alongside `session.destroy()`
- Add a one-sentence note in the `authenticate` middleware task confirming whether DB lookup is in scope or deferred
- Add a verification note cross-referencing that `app.ts` already sets `httpOnly: true, sameSite: 'lax'`

#### Risk Assessment: **MEDIUM**

The session fixation gap is a real security issue that should be closed before shipping, even on a homelab. The fix is two lines, but it's the kind of thing that won't appear in functional tests. Everything else is well-structured.

---

### Plan 02-02: Frontend Login Page, Auth Context, Protected Routes

#### Summary

A clean, idiomatic React auth implementation using TanStack Query for session state. The dependency on 02-01 is correctly declared and the component boundaries are sensible. The main risks are behavioral edge cases around stale query data on user-switch, incomplete error handling for network failures vs. auth failures, and a scope-creep question about the dashboard showing "points."

#### Strengths

- **TanStack Query for auth state** is the right pattern — avoids manual loading/error state juggling and provides automatic revalidation
- **`withCredentials: true`** correctly set — session cookies won't work without this
- **Loading spinner before auth check completes** prevents flash-of-unauthenticated-content
- **Generic "Invalid email or password"** on the frontend mirrors the backend, no info leak
- **Wildcard `*` → redirect to `/`** catches all unknown routes cleanly

#### Concerns

- **[HIGH] Stale query data after logout/re-login as different user.** The logout mutation sets `['auth', 'me']` query data to null, but doesn't call `queryClient.clear()` or invalidate other query keys. If a parent logs out and a child logs in immediately, any cached data from the parent's session (chores, points, etc. — loaded by future phases) will remain in the cache until those queries revalidate. For a single-device family scenario (likely), this is a real UX bug. Fix: call `queryClient.clear()` in the logout mutation's `onSuccess` handler.

- **[MEDIUM] No distinction between 401 (unauthenticated) and network errors in `useQuery(['auth', 'me'])`**. If `getCurrentUser()` fails because the server is unreachable vs. because there's no session, the `ProtectedRoute` behavior will differ. The plan should specify: network error → show error state (don't redirect to login); 401 → redirect to login. Without this, a brief server hiccup logs everyone out.

- **[MEDIUM] 403 page component is unspecified.** The plan says ProtectedRoute "shows 403 page if requiredRole doesn't match" but doesn't define what component renders, where it lives, or what it shows. For Phase 2 this is a loose end — children redirected to a blank or broken 403 page creates a jarring UX. Even a single-line inline message is better than leaving this undefined.

- **[LOW] `DashboardPage` shows "user name, points."** Points aren't part of Phase 2's requirements (AUTH-01, AUTH-02). Showing points implies either a points API call or hardcoded placeholder data. This is scope creep that introduces a dependency on a future phase's API. The dashboard for Phase 2 should show only what's available: user name and a logout button. Points can be wired up in the Points phase.

- **[LOW] Axios instance baseURL inconsistency.** `auth.api.ts` uses `baseURL: '/api/auth'`. If other API files (chores, users, etc.) each create their own axios instances, there's no shared interceptor for global error handling (e.g., 401 auto-logout). The plan should either use a shared `client.ts` base instance (which the original codebase had) or explicitly note that `auth.api.ts` is the exception.

- **[LOW] `staleTime` not specified for the auth query.** Without `staleTime: Infinity` (or a high value), TanStack Query will refetch `['auth', 'me']` on every window focus event. For an auth check this causes unnecessary server load and a flash before the auth state resolves. Auth state changes only on login/logout — `staleTime: Infinity` with manual invalidation is the correct setting.

#### Suggestions

- Add `queryClient.clear()` in logout mutation `onSuccess` to prevent stale cross-user data
- Add explicit `staleTime: Infinity` to the auth query
- Distinguish 401 vs. network error in `getCurrentUser` error handling in `ProtectedRoute`
- Trim DashboardPage to name + logout button only; add a `// TODO: wire points in Points phase` comment
- Specify (even briefly) what the 403 view renders
- Confirm whether `auth.api.ts` extends a shared axios base instance or is standalone

#### Risk Assessment: **MEDIUM**

No blocking issues, but the stale query data bug will be immediately visible in a real family household where multiple people share a device. The 403 component gap is a loose end that should be closed before integration testing in later phases.

---

### Overall Phase 2 Assessment

**Risk: MEDIUM → LOW with targeted fixes**

Both plans are well-structured and the phase goal is achievable. The two items worth addressing before execution: (1) session regeneration after login in 02-01, and (2) `queryClient.clear()` on logout in 02-02. Everything else is either low-risk or can be addressed incrementally. The TDD approach in 02-01 is the right call for auth code and will catch the error path behavior naturally if the test specs are written before the implementation.

---

## Qwen Review

**Failed** — Qwen OAuth free tier was discontinued on 2026-04-15. Run `/auth` to switch to Coding Plan, OpenRouter, or another provider. No review output produced.

---

## OpenCode Review

**Skipped** — Running inside OpenCode. Self-review would not provide independent perspective.

---

## Consensus Summary

*Note: Only one reviewer (Claude) produced output. Full consensus analysis requires 2+ reviewers. The following synthesizes Claude's cross-plan findings.*

### Agreed Strengths

*(Single reviewer — listed for reference)*

- TDD-first approach for auth backend is the correct discipline
- TanStack Query for auth state management is idiomatic and clean
- Generic error messages protect against user enumeration on both sides
- Role authorization reads from session (not request body)
- Threat model explicitly accepts scope exclusions with justification

### Agreed Concerns

*(Single reviewer — listed for reference)*

- **Session fixation**: No `session.regenerate()` after login (HIGH)
- **Stale query data**: `queryClient.clear()` missing on logout, risking cross-user data leaks (HIGH)
- **Ghost sessions**: Deleted users retain access until session expiry (MEDIUM)
- **Error handling**: No distinction between 401 and network errors in auth check (MEDIUM)
- **Scope creep**: Dashboard shows points which aren't part of Phase 2 (LOW)

### Divergent Views

None — single reviewer.

### Recommended Actions

1. **Fix session fixation** — Add `req.session.regenerate()` in POST /login route (2 lines)
2. **Fix stale data on logout** — Add `queryClient.clear()` in logout mutation's `onSuccess` (1 line)
3. **Consider ghost session validation** — Add lightweight DB check in `authenticate` middleware
4. **Distinguish error types** — Handle 401 vs network errors differently in ProtectedRoute
5. **Scope trim DashboardPage** — Remove points display until Points phase
