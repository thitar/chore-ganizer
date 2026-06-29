---
phase: 02-authentication
plan: 02
subsystem: frontend
tags: [auth, react-query, react-router, protected-route, context]
requires:
  - phase: 02-authentication
    provides: "auth.service + /api/auth routes (plan 02-01)"
provides:
  - "auth.api.ts with login/logout/getCurrentUser using Axios withCredentials"
  - "useAuth.tsx with React Query + login/logout mutations + context provider"
  - "LoginPage with form, validation, error display, redirect on success"
  - "ProtectedRoute component that redirects to /login if no session"
  - "App.tsx routes all wired (with /login as the only public route)"
  - "DashboardPage with name + logout button (Phase 2 minimal scope)"
affects: [02-authentication, 03-core-chore-crud, 04-recurring-chores, 05-points-calendar, 06-user-management, 07-frontend-polish-docker]

tech-stack:
  patterns:
    - "React Query for auth state (single query ['auth','me'] with staleTime: Infinity)"
    - "useMutation onSuccess invalidates ['auth'] to refresh current-user query"
    - "axios withCredentials: true so the session cookie is sent on every request"
    - "App.tsx with BrowserRouter + ProtectedRoute wrapper pattern"

key-files:
  created:
    - path: frontend-v2/src/api/auth.api.ts
      provides: "login/logout/getCurrentUser"
    - path: frontend-v2/src/hooks/useAuth.tsx
      provides: "AuthContext + AuthProvider + useAuth hook"
    - path: frontend-v2/src/components/ProtectedRoute.tsx
      provides: "Auth gate that redirects to /login or shows 403"
    - path: frontend-v2/src/pages/LoginPage.tsx
      provides: "Email/password form with validation"
    - path: frontend-v2/src/pages/DashboardPage.tsx
      provides: "Minimal dashboard showing user name + logout (Phase 2 placeholder)"
  modified:
    - path: frontend-v2/src/App.tsx
      provides: "BrowserRouter + routes for /login and / (with ProtectedRoute)"
    - path: frontend-v2/src/main.tsx
      provides: "QueryClientProvider + AuthProvider wrap the app"

duration: ~30min
commits: 1
completed_at: 2026-05-23
---

# Plan 02-02 — Frontend login page, auth context, protected routes

> Retroactive summary: plan was executed May 2026 (commit on `gsd/phase-02-authentication` branch). Subsequent plan 02-04 trimmed DashboardPage to name+logout only (deferring points UI to Phase 5).

## What was built

- **api/auth.api.ts**: thin Axios wrapper. `login(email, password)` POSTs to `/api/auth/login`; `logout()` POSTs to `/api/auth/logout`; `getCurrentUser()` GETs `/api/auth/me`. All calls use `withCredentials: true` to send the session cookie.
- **hooks/useAuth.tsx**: React Query `useQuery({queryKey: ['auth','me'], staleTime: Infinity})` is the single source of truth for the current user. `login` and `logout` are mutations; `login` invalidates `['auth']` on success; `logout` clears the query cache and sets `['auth','me']` to null.
- **components/ProtectedRoute.tsx**: Wraps a route. If no user, redirects to `/login`. If `requiredRole` is set and the user doesn't match, renders a 403 page.
- **pages/LoginPage.tsx**: Email + password fields, client-side validation (`type=email`, `required`), error display, disabled submit while in flight, redirect to `/` on success.
- **pages/DashboardPage.tsx**: Minimal Phase-2 placeholder — shows the user's name, role, and a Logout button. (Later trimmed by plan 02-04 to defer the points widget.)
- **App.tsx**: `BrowserRouter` + routes. `/login` is public. `/` is wrapped in `<ProtectedRoute>`. `main.tsx` wraps in `QueryClientProvider` + `AuthProvider`.

## Test coverage (originally 2 tests; expanded later)

- `scaffold.test.tsx`: 2 tests verifying the app shell renders
- (Subsequent plans added more thorough auth tests; see plan 02-04 SUMMARY for hardening details.)

## Key decisions

- **React Query over Zustand/Context-only**: the AGENTS.md line "auth state lives in useAuth.tsx context, not Zustand" + a single query gives us automatic refetch on window focus if desired, optimistic updates, and invalidation as the primary mutation-completion signal.
- **staleTime: Infinity on `['auth','me']`**: the user doesn't change their role/email mid-session, so we don't need a refetch. (`user.color` was the exception — fixed in Path A.)
- **ProtectedRoute as a wrapper, not a hook**: makes the route protection explicit at the route definition site (`<Route element={<ProtectedRoute requiredRole="PARENT">...</ProtectedRoute>}`).

## Diff / commit

Original commit is on the `gsd/phase-02-authentication` branch. This retroactive SUMMARY was generated 2026-06-29 as part of the milestone audit gap-closure pass.
