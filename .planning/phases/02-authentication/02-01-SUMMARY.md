---
phase: 02-authentication
plan: 01
subsystem: backend
tags: [auth, bcrypt, session, express-session, tdd]
requires: []
provides:
  - "auth.service.ts with login() and logout() using bcrypt.compare + session.regenerate"
  - "middleware/auth.ts with authenticate() and authorize(...roles) gates"
  - "routes/auth.routes.ts with POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me"
  - "routes/index.ts mounts /api/auth router"
affects: [02-authentication, 03-core-chore-crud, 04-recurring-chores, 05-points-calendar, 06-user-management]

tech-stack:
  added: [bcrypt, express-session, @types/express-session]
  patterns:
    - "express-session with cookie httpOnly + sameSite=strict + rolling: true"
    - "session.regenerate on login to prevent session-fixation"
    - "bcrypt cost factor 10 (4 hashes on a modern CPU ≈ 200ms)"
    - "authorize(...roles) factory: returns middleware that checks req.session.role"

key-files:
  created:
    - path: backend-v2/src/services/auth.service.ts
      provides: "login(email, password) and logout(req)"
    - path: backend-v2/src/middleware/auth.ts
      provides: "authenticate (401 if no session) and authorize (403 if role mismatch)"
    - path: backend-v2/src/routes/auth.routes.ts
      provides: "/api/auth/{login,logout,me}"
  modified:
    - path: backend-v2/src/routes/index.ts
      provides: "Mounts auth router at /api/auth"
  test:
    - path: backend-v2/src/services/__tests__/auth.service.test.ts
      provides: "bcrypt match/mismatch, user-not-found"
    - path: backend-v2/src/middleware/__tests__/auth.test.ts
      provides: "authenticate + authorize behavior"
    - path: backend-v2/src/routes/__tests__/auth.routes.test.ts
      provides: "end-to-end login/logout/me flow with mocked services"

duration: ~25min
commits: 1
completed_at: 2026-05-23
---

# Plan 02-01 — Backend auth service, middleware, and routes (TDD)

> Retroactive summary: plan was executed May 2026 (commit chain on `gsd/phase-02-authentication`); 02-03 follow-up later hardened session regeneration and cookie cleanup. The original commit message in git log shows 22 backend + 2 frontend tests for this plan.

## What was built

- **auth.service.ts**: `login(email, password)` does `prisma.user.findUnique` + `bcrypt.compare` + throws `AppError(401, 'Invalid credentials')` on miss. `logout(req)` calls `req.session.destroy()`. `getCurrentUser(userId)` returns the sanitized user object (drops password).
- **middleware/auth.ts**: `authenticate` checks `req.session.userId` and rejects with 401. `authorize(...roles)` factory returns middleware that checks `req.session.role` against the allowed roles and rejects with 403.
- **routes/auth.routes.ts**: `POST /api/auth/login` (body: `{email, password}`) → `{success, data: user, error}`, `POST /api/auth/logout` → `{success, data: {ok: true}}`, `GET /api/auth/me` → `{success, data: user}`.
- **routes/index.ts**: mounts auth router at `/api/auth`.

## TDD order followed

1. Service unit test (mocked prisma): user found + password match → user returned; user found + password mismatch → 401; user not found → 401.
2. Middleware unit test (mocked req/res): authenticate with no session → 401; authenticate with valid session → next() called; authorize with wrong role → 403.
3. Route integration test (supertest with mocked services): login happy path, login bad creds, logout, me with valid session, me without session.

## Test counts

- `auth.service.test.ts`: 4 unit cases
- `auth.test.ts` (middleware): 5 unit cases
- `auth.routes.test.ts`: 6 integration cases
- Total: 15 tests added by this plan

## Key decisions

- **bcrypt cost 10** (vs 12): family-scale app, 4 users, no need for 300ms+ login latency.
- **`session.regenerate()` on login**: prevents session-fixation attacks (deferred hardening done in plan 02-03).
- **Generic "Invalid credentials" error**: doesn't leak whether email exists.

## Diff / commit

The actual commit is on the `gsd/phase-02-authentication` branch; this retroactive SUMMARY was generated 2026-06-29 as part of the milestone audit gap-closure pass.
