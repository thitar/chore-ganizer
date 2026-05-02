# Requirements: Chore-Ganizer Codebase Health & Quality

**Defined:** 2026-05-01
**Core Value:** A robust, secure, maintainable, and well-tested codebase that eliminates known risks and sets up the project for future feature development without accumulating more tech debt.

## v1 Requirements

### Tech Debt (TECH)

- [x] **TECH-01**: Delete dead `recurring-chores.routes.ts` (394 lines, zero imports)
- [ ] **TECH-02**: Migrate Prisma `$use` middleware to `$extends` query extension for `recurrenceRule` JSON serialization
- [ ] **TECH-03**: Extract `PocketMoneyService` from fat `pocket-money.controller.ts` (817 lines, 27 prisma calls → thin HTTP layer)
- [x] **TECH-04**: Eliminate `as any` casts in production code (client.ts CSRF retry, errorHandler.ts Prisma error, database.ts middleware)
- [ ] **TECH-05**: Standardize service file naming to `dot.case.ts` (rename `emailService.ts` and delete `notificationService.ts` — dead code)
- [x] **TECH-06**: Mount `metricsRoutes` via `routes/index.ts` for route mounting consistency
- [ ] **TECH-07**: Migrate from `prisma db push` to versioned `prisma migrate deploy` in Docker entrypoint

### Dependency Security (DEPS)

- [x] **DEPS-01**: Fix npm vulnerabilities (axios, follow-redirects, nodemailer, lodash, vite) via `npm audit fix` in both packages
- [ ] **DEPS-02**: Replace hardcoded seed password with stronger default or force-change-on-first-login flow, syncing both seed.ts and docker-entrypoint.sh
- [ ] **DEPS-03**: Upgrade Prisma from 5.22.0 to 6.x (gated on TECH-02 completion)

### Performance (PERF)

- [ ] **PERF-01**: Wrap `applyOverduePenalty` in `$transaction` to fix race condition (double-penalty guard)
- [ ] **PERF-02**: Parallelize `processAllOverdue` penalty processing with `Promise.allSettled()`
- [ ] **PERF-03**: Eliminate N+1 notification queries in penalty flow (batch-fetch parent notification settings)

### Bug Fixes & Code Quality (BUGS)

- [ ] **BUGS-01**: Fix nested ternary in `recurring-chores-occurrences.controller.ts` line 52
- [ ] **BUGS-02**: Type `transformRecurringChore` input as `Prisma.RecurringChoreGetPayload` instead of `any`
- [ ] **BUGS-03**: Log original data in `safeParseAssignedUserIds` error path for debugging data corruption
- [ ] **BUGS-04**: Gate all 45 unconditional console statements in frontend behind a shared `debug.ts` utility

### Test Coverage (TEST)

- [ ] **TEST-01**: Add unit tests for all 15 controllers (mock services, never Prisma)
- [ ] **TEST-02**: Add unit tests for 8 untested services (recurring-chores subsystem priority)
- [ ] **TEST-03**: Test overdue penalty edge cases (double-penalty via `$transaction`, timezone, integer rounding)
- [ ] **TEST-04**: Increase frontend test coverage from 22% to at least 50% (hooks, pages, error handling)
- [ ] **TEST-05**: Add `coverageThreshold` to Jest and Vitest configs to prevent regression

## v2 Requirements

### Architecture Refinements (ARCH)

- **ARCH-01**: Delete `notificationService.ts` (214 lines, 0 production imports — confirmed dead code)
- **ARCH-02**: Show toast notification on unauthorized access redirect for children
- **ARCH-03**: Consider `connect-sqlite3` session store for persistence across restarts

### Security Hardening

- **SEC-01**: Migrate CSP from `'unsafe-inline'` to nonce-based for React inline scripts
- **SEC-02**: Implement periodic `SESSION_SECRET` rotation mechanism

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-family support (PostgreSQL migration) | Scaling path, not current need. SQLite fine for single-family. |
| Redis session/cache store | Single-instance deployment. connect-sqlite3 is simpler upgrade path. |
| Frontend-Backend parameter name standardization | Mapping already handled in `api/` layer. Full rename is high-risk, low-reward. |
| Admin UI for rate limit visibility | `/api/admin/rate-limits` endpoint already exists. UI can wait. |
| Console statement removal (vs. gating) | Gating behind debug flag is sufficient. Production debugging benefits from having the calls available. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TECH-01 | Phase 1 - Foundation & Cleanup | Completed (01-01) |
| TECH-02 | Phase 2 - Prisma Modernization | Pending |
| TECH-03 | Phase 3 - Architecture & Performance | Pending |
| TECH-04 | Phase 1 - Foundation & Cleanup | Complete |
| TECH-05 | Phase 3 - Architecture & Performance | Pending |
| TECH-06 | Phase 1 - Foundation & Cleanup | Completed (01-01) |
| TECH-07 | Phase 3 - Architecture & Performance | Pending |
| DEPS-01 | Phase 1 - Foundation & Cleanup | Completed (01-01) |
| DEPS-02 | Phase 3 - Architecture & Performance | Pending |
| DEPS-03 | Phase 2 - Prisma Modernization | Pending |
| PERF-01 | Phase 3 - Architecture & Performance | Pending |
| PERF-02 | Phase 3 - Architecture & Performance | Pending |
| PERF-03 | Phase 3 - Architecture & Performance | Pending |
| BUGS-01 | Phase 1 - Foundation & Cleanup | Pending |
| BUGS-02 | Phase 1 - Foundation & Cleanup | Pending |
| BUGS-03 | Phase 1 - Foundation & Cleanup | Pending |
| BUGS-04 | Phase 1 - Foundation & Cleanup | Pending |
| TEST-01 | Phase 4 - Test Coverage & Gates | Pending |
| TEST-02 | Phase 4 - Test Coverage & Gates | Pending |
| TEST-03 | Phase 4 - Test Coverage & Gates | Pending |
| TEST-04 | Phase 4 - Test Coverage & Gates | Pending |
| TEST-05 | Phase 4 - Test Coverage & Gates | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-05-01*
*Last updated: 2026-05-02 — traceability populated by roadmap creation*
