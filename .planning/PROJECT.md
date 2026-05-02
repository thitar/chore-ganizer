# Chore-Ganizer — Codebase Health & Quality

## What This Is

A family chore management platform (Express.js + React + SQLite) with a remediated codebase — all known technical debt, security vulnerabilities, performance issues, test coverage gaps, and code quality concerns from the initial audit have been systematically resolved across 4 milestone phases.

## Core Value

A robust, secure, maintainable, and well-tested codebase that eliminates known risks and sets up the project for future feature development without accumulating more tech debt.

## Requirements

### Validated

- ✓ User authentication with sessions and CSRF — existing
- ✓ Chore templates, assignments, and recurring chore system — existing
- ✓ Point transactions and pocket money tracking — existing
- ✓ Parent/child role-based access control — existing
- ✓ Email and ntfy.sh push notification dispatch — existing
- ✓ Health checks and Prometheus metrics — existing
- ✓ Docker Compose deployment with auto-seeding — existing
- ✓ Admin user management and rate limit visibility — existing
- ✓ Overdue penalty system — existing
- ✓ Frontend with Tailwind CSS, Vite, and lazy-loaded routes — existing

### Validated (v2.1.10)

- ✓ **TECH-01** — Delete dead `recurring-chores.routes.ts` (Phase 1)
- ✓ **TECH-02** — Migrate Prisma `$use` to `$extends` (Phase 2)
- ✓ **TECH-03** — Extract `PocketMoneyService` from fat controller (Phase 3)
- ✓ **TECH-04** — Eliminate `as any` casts in production code (Phase 1)
- ✓ **TECH-05** — Standardize service file naming to `dot.case.ts` (Phase 3)
- ✓ **TECH-06** — Disambiguate notification services (Phase 3)
- ✓ **TECH-07** — Migrate to versioned `prisma migrate deploy` (Phase 3)
- ✓ **TECH-08** — Mount `metricsRoutes` via `routes/index.ts` (Phase 1)
- ✓ **TECH-09** — Gate all 57 frontend console statements behind debug.ts (Phase 1)
- ✓ **DEPS-01** — Fix npm vulnerabilities across both packages (Phase 1)
- ✓ **DEPS-02** — Seed password warning on every startup (Phase 3)
- ✓ **DEPS-03** — Upgrade Prisma from 5.22 to 6.19.3 (Phase 2)
- ✓ **PERF-01** — Fix overdue penalty race with `$transaction` (Phase 3)
- ✓ **PERF-02** — Parallelize penalty processing with `Promise.allSettled` (Phase 3)
- ✓ **PERF-03** — Eliminate N+1 notification queries in penalty flow (Phase 3)
- ✓ **BUGS-01** — Fix nested ternary in occurrences controller (Phase 1)
- ✓ **BUGS-02** — Type `transformRecurringChore` input (Phase 1)
- ✓ **BUGS-03** — Log corrupt data in parse error path (Phase 1)
- ✓ **BUGS-04** — Toast on unauthorized redirect for children (Phase 1)
- ✓ **TEST-01** — Unit tests for all 15 controllers (Phase 4)
- ✓ **TEST-02** — Unit tests for 8 untested services (Phase 4)
- ✓ **TEST-03** — Overdue penalty edge case tests (Phase 4)
- ✓ **TEST-04** — Frontend test coverage from 22% to 68% (Phase 4)
- ✓ **TEST-05** — Coverage thresholds in CI configs (Phase 4)

### Active

*None — all v2.1.10 requirements completed.*

### Out of Scope

- Scaling to multi-family support (requires PostgreSQL migration) — deferred
- Redis/session persistence for multi-instance — deferred as single-instance is sufficient
- CSP nonce-based inline script migration — deferred to later security hardening
- Comprehensive admin UI for rate limits — existing `/api/admin/rate-limits` endpoint is sufficient
- Version synchronization automation — current `docker-compose.sh` script is adequate

## Context

All 22 issues from the initial codebase audit have been systematically resolved. The codebase is now clean of known tech debt, vulnerabilities, and performance issues.

- **Stack**: Backend (Express.js, Prisma 6.19.3, SQLite, Jest) + Frontend (React 18, Vite, Tailwind, Vitest)
- **Deployment**: Docker Compose, self-hosted, single-instance, versioned Prisma migrations
- **Auth**: Express sessions (MemoryStore), bcrypt, CSRF tokens, PARENT/CHILD roles
- **Domain**: Family chore management with chore assignments, recurring chores, point transactions (cents), overdue penalties, and notifications (email + ntfy push)
- **Current state**: All 22 requirements delivered. Test coverage at 72% backend statements, 68% frontend statements. CI enforces coverage thresholds. Zero HIGH/CRITICAL npm vulnerabilities. Prisma modernized to 6.x with $extends. PocketMoney controller extracted from 817→56 lines. Penalty processing is race-condition-free with parallel execution.
- **Known deferred**: Integration test DB lifecycle hardening (low risk), SQLite scaling limits (single-family OK), CSP nonce migration (separate concern)

## Constraints

- **Tech stack**: Must stay on Express.js + React + SQLite + Prisma (no rewriting in different framework)
- **Backward compatibility**: Existing users must not lose data during migrations
- **Docker deployment**: Entrypoint scripts must be updated alongside Prisma migration changes
- **Security**: No regression on auth, CSRF, or session management
- **Testing**: Use existing test frameworks (Jest, Vitest, Playwright)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Address all CONCERNS.md items in one milestone | Holistic approach prevents partial fixes from being undone later | ✓ Good — all 22 items delivered across 4 phases |
| Prisma `$use` → `$extends` migration required before upgrading Prisma | v6 removes `$use` entirely | ✓ Good — seamless upgrade, 0 breaking changes |
| Service file naming standardized to `dot.case.ts` | 13 of 17 services already use it | ✓ Good — emailService renamed, notificationService deleted |
| Phase branching strategy | Isolate each phase's work in its own branch | ✓ Good — clean separation, easy to review per phase |
| TDD for bug fixes (RED→GREEN→REFACTOR) | Ensure test coverage before implementation changes | ✓ Good — 4 plans with verified RED→GREEN commit sequences |
| Controller tests written AFTER service extraction | Testing before extraction guarantees breakage | ✓ Good — extracted services are independently testable |
| Penalty fixes separate from Prisma modernization | Different risk profiles | ✓ Good — Prisma upgrade isolated from runtime changes |
| Coverage thresholds in Jest/Vitest configs | CI exit code enforces without separate gate step | ✓ Good — 50/40/45/50 thresholds prevent regression |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after v2.1.10 milestone*
