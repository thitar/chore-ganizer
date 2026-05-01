# Chore-Ganizer — Codebase Health & Quality

## What This Is

A focused effort to resolve technical debt, security vulnerabilities, test coverage gaps, and performance issues in the Chore-Ganizer app — a family chore management platform (Express.js + React + SQLite). The app already works, but CONCERNS.md identified 30+ issues that need systematic resolution to ensure long-term maintainability, security, and reliability.

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

### Active

#### Tech Debt (TECH)
- [ ] **TECH-01**: Delete dead `recurring-chores.routes.ts` (394 unused lines)
- [ ] **TECH-02**: Migrate Prisma `$use` to `$extends` for recurrenceRule serialization
- [ ] **TECH-03**: Extract `PocketMoneyService` from fat `pocket-money.controller.ts` (817 lines)
- [ ] **TECH-04**: Eliminate `as any` casts in production code (client.ts, errorHandler.ts, database.ts)
- [ ] **TECH-05**: Standardize service file naming to `dot.case.ts`
- [ ] **TECH-06**: Disambiguate notification services (rename `notificationService.ts` → `notification-dispatch.service.ts`)
- [ ] **TECH-07**: Migrate from `prisma db push` to versioned `prisma migrate deploy`
- [ ] **TECH-08**: Mount `metricsRoutes` via `routes/index.ts` for consistency
- [ ] **TECH-09**: Gate all console statements behind debug flag in frontend

#### Dependency Security (DEPS)
- [ ] **DEPS-01**: Fix npm vulnerabilities — upgrade axios, follow-redirects, nodemailer, lodash, vite
- [ ] **DEPS-02**: Replace hardcoded seed password with auto-generated secure password or force-change flow
- [ ] **DEPS-03**: Unblock Prisma upgrade path (remove `$use` dependency)

#### Performance (PERF)
- [ ] **PERF-01**: Fix overdue penalty race condition with `$transaction`
- [ ] **PERF-02**: Parallelize penalty processing with `Promise.allSettled()`
- [ ] **PERF-03**: Eliminate N+1 notification queries in penalty flow

#### Bug Fixes & Code Quality (BUGS)
- [ ] **BUGS-01**: Fix nested ternary in `recurring-chores-occurrences.controller.ts`
- [ ] **BUGS-02**: Type `transformRecurringChore` input instead of `dbRecord: any`
- [ ] **BUGS-03**: Log original data in `safeParseAssignedUserIds` error path
- [ ] **BUGS-04**: Show toast notification on unauthorized access redirect for children

#### Test Coverage (TEST)
- [ ] **TEST-01**: Add unit tests for all 15 controllers
- [ ] **TEST-02**: Add unit tests for 8 untested services (recurring-chores priority)
- [ ] **TEST-03**: Test overdue penalty edge cases (double-penalty, timezone, rounding)
- [ ] **TEST-04**: Test CSRF token retry logic in client.ts
- [ ] **TEST-05**: Increase frontend test coverage from 22% to at least 50%

### Out of Scope

- Scaling to multi-family support (requires PostgreSQL migration) — deferred
- Redis/session persistence for multi-instance — deferred as single-instance is sufficient
- CSP nonce-based inline script migration — deferred to later security hardening
- Comprehensive admin UI for rate limits — existing `/api/admin/rate-limits` endpoint is sufficient
- Version synchronization automation — current `docker-compose.sh` script is adequate

## Context

The codebase scan identified technical debt across tech stack, security, performance, testing, and architecture. Key background:

- **Stack**: Backend (Express.js, Prisma 5.22, SQLite, Jest) + Frontend (React 18, Vite, Tailwind, Vitest)
- **Deployment**: Docker Compose, self-hosted, single-instance
- **Auth**: Express sessions (MemoryStore), bcrypt, CSRF tokens, PARENT/CHILD roles
- **Domain**: Family chore management with chore assignments, recurring chores, point transactions (cents), overdue penalties, and notifications (email + ntfy push)
- **Current state**: App is functional and deployed. Issues are tech debt accumulated during development.
- **Existing planning**: `.planning/codebase/` contains full codebase map (STACK.md, ARCHITECTURE.md, STRUCTURE.md, INTEGRATIONS.md, CONCERNS.md)

## Constraints

- **Tech stack**: Must stay on Express.js + React + SQLite + Prisma (no rewriting in different framework)
- **Backward compatibility**: Existing users must not lose data during migrations
- **Docker deployment**: Entrypoint scripts must be updated alongside Prisma migration changes
- **Security**: No regression on auth, CSRF, or session management
- **Testing**: Use existing test frameworks (Jest, Vitest, Playwright)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Address all CONCERNS.md items in one milestone | Holistic approach prevents partial fixes from being undone later | — Pending |
| Prisma `$use` → `$extends` migration required before upgrading Prisma | v6 removes `$use` entirely | — Pending |
| Service file naming standardized to `dot.case.ts` | 13 of 17 services already use it | — Pending |

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
*Last updated: 2026-05-01 after initialization*
