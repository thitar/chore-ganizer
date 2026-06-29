# Milestones

## v1-rewrite Simplified Rebuild (Shipped: 2026-06-29)

**Phases completed:** 7 phases, 27 plans, 24 tasks

**Key accomplishments:**

- Three security gaps from cross-AI review closed: session fixation, ghost sessions, and cookie residue — with updated test coverage proving each fix.
- Four issues from cross-AI review closed: stale query cache on logout, no error type discrimination in ProtectedRoute, dashboard scope creep (points), and suboptimal auth caching — with React Router v7 future flags opted in.
- Prisma schema updated with PointLog model, pointsAwarded field, Zod installed, and validation middleware created — all Phase 3 plans can now depend on this foundation.
- TDD implementation of ChoreTemplate CRUD — 4 operations (create, list, update, delete) with auth gating, Zod validation, cascade logic, and 22 passing tests.
- TDD implementation of full assignment lifecycle — 7 operations with role-scoped queries, transactional completion with PointLog audit trail, and 86 total tests passing across the backend.
- Axios API clients and React Query hooks bridging backend API to frontend pages — type-safe, D-17 parameter mapping, automatic cache invalidation.
- Four shared presentational components created — NavBar extracted from DashboardPage with role-conditional links, FilterBar with live controls, StatusBadge with status pills, and ConfirmDelete with inline confirmation panel.
- Two full page components with comprehensive state coverage — TemplatesPage for parent-only template CRUD, MyChoresPage for role-scoped chore list with complete flow. 17 unit tests verify all states.
- Final plan of Phase 3 — AssignmentsPage with full CRUD and user filtering, Dashboard updated with Upcoming Chores section, and all Phase 3 routes wired in App.tsx. Phase 3 is now feature-complete across frontend and backend.
- Complete
- Complete
- Complete
- Complete
- Complete

---

## v2.1.10 — Codebase Remediation

**Shipped:** 2026-04-28
**Phases:** 1 | **Plans:** 8

### What Was Built

Security hardening, CSRF retry prevention, bug fixes, test coverage expansion, performance improvements, controller refactoring, and documentation improvements addressing all codebase audit concerns.

### Key Accomplishments

1. Security hardening: SESSION_SECRET validation + production error sanitization
2. CSRF retry loop prevention with 5 Vitest tests
3. Access denied toast for child users + CI version sync gate
4. Frontend error handling test coverage (401/network/500 paths)
5. Overdue penalty edge case hardening (18 Jest tests, double-penalty guard)
6. Batch occurrence generation via Prisma createMany + console-to-Winston migration
7. Controller refactoring: 966-line monolithic → 299 + 288 line focused controllers
8. Parameter naming conventions documented + JSON storage evaluation

### Stats

- **Commits:** 63
- **Files changed:** 41
- **Lines:** +5,887 / -1,329
- **Build:** Backend + Frontend clean
- **Tests:** 241 unit + 147 integration passing
- **Lint:** Backend ESLint clean
- **UAT:** 8/8 passed
- **Security:** 16/16 threats closed (13 mitigated, 3 accepted)

### Known Gaps

- API Rate Limiting Visibility deferred (MISSING_FEATURES.md)
- Recurrence service edge case tests deferred (MISSING_FEATURES.md)

## v2.2.0 — Admin Dashboard

**Shipped:** 2026-05-03
**Phases:** 5-10 | **Plans:** 11

### What Was Built

Full admin dashboard with health status, chore statistics, point summary, activity feed, rate limit monitoring, user management, and notification settings — all parent-only with family-scoped data isolation.

### Key Accomplishments

1. Backend foundations: health endpoint, audit service, admin service with 6 dashboard sections
2. Admin backend routes, controllers, and auth with family scoping
3. 43 new backend tests (health, admin service, admin controller)
4. 7 admin card components with loading/error/empty/data states
5. Admin page integration with responsive grid layout
6. Swagger API documentation for all admin endpoints

### Stats

- **Phases:** 6 (Phase 5-10)
- **Plans:** 11
- **Tests:** Backend 284 passed, Frontend 195 passed
- **Build:** Backend + Frontend clean

## v2.3.0 — Production Readiness

**Status:** In progress
**Phases:** 11-14 | **Plans:** 7

### Goal

Fix all 7 CONCERNS.md items to establish a production-quality baseline where point accounting is trustworthy, penalty behavior is correct, and all dashboard features work end-to-end.
