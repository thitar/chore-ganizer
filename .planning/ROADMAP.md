# Roadmap: Chore-Ganizer Codebase Health & Quality

## Overview

This remediation milestone systematically eliminates 22 known issues across dependency security, tech debt, performance, bugs, and test coverage in the Chore-Ganizer app. The journey moves from low-risk foundation cleanup (dead code, npm vulns, type safety) through the highest-risk Prisma modernization (deprecated `$use` → typed `$extends`, then upgrade to 6.x), into architecture restructuring (fat controller extraction, versioned migrations, penalty race-condition fixes), and concludes with comprehensive test coverage and CI gates that prevent regression. Phases are dependency-ordered — each delivers a coherent, verifiable improvement to codebase health.

## Phases

- [ ] **Phase 1: Foundation & Cleanup** - Eliminate dead code, npm vulnerabilities, type safety violations, and known bugs
- [ ] **Phase 2: Prisma Modernization** - Migrate Prisma middleware from deprecated `$use` to typed `$extends`, then upgrade to 6.x
- [ ] **Phase 3: Architecture & Performance** - Extract fat controller, standardize services, version-control migrations, fix penalty race conditions
- [ ] **Phase 4: Test Coverage & Gates** - Add comprehensive tests and CI coverage gates to prevent regression

## Phase Details

### Phase 1: Foundation & Cleanup
**Goal**: The codebase is free of dead code, npm vulnerabilities, type safety violations, and known bugs — a clean foundation for deeper remediation.
**Depends on**: Nothing (first phase)
**Requirements**: DEPS-01, TECH-01, TECH-04, TECH-06, BUGS-01, BUGS-02, BUGS-03, BUGS-04
**Success Criteria** (what must be TRUE):
  1. `npm audit` returns zero vulnerabilities in both `backend/` and `frontend/` directories
  2. Dead file `recurring-chores.routes.ts` is deleted and all imports across the codebase are verified clean
  3. TypeScript compilation passes with zero `as any` casts in production source (validated via `@typescript-eslint/no-explicit-any: "error"`)
  4. All route file mounts follow the same pattern through `routes/index.ts` — no direct `app.use()` calls in `app.ts`
  5. Frontend browser console shows no unconditional output — all 45 console statements gated behind shared `debug.ts` utility
**Plans**: 4 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — DEPS-01: npm audit fix (both packages) + TECH-01: delete dead route file + TECH-06: move metricsRoutes to routes/index.ts
- [x] 01-02-PLAN.md — TECH-04: eliminate `as any` casts (client.ts D-01 local shadow types + errorHandler.ts D-02 instanceof guard)
- [x] 01-03-PLAN.md — BUGS-01: nested ternary → if/else + BUGS-02: typed transformRecurringChore + BUGS-03: log corrupt data in safeParseAssignedUserIds
- [x] 01-04-PLAN.md — BUGS-04: create debug.ts utility + replace all 57 console statements across 14 files
**UI hint**: yes

### Phase 2: Prisma Modernization
**Goal**: Prisma is on latest 6.x with fully typed `$extends` query extensions, unblocking future upgrades and eliminating the deprecated `$use` API.
**Depends on**: Phase 1
**Requirements**: TECH-02, DEPS-03
**Success Criteria** (what must be TRUE):
  1. All Prisma read/write operations use typed `$extends` query extension with proper JSON serialization — zero `$use` calls remain in `database.ts`
  2. Prisma and `@prisma/client` upgraded to 6.x, client regenerated, and all existing unit and integration tests pass
  3. Existing recurring chore data with JSON `recurrenceRule` fields survives the middleware migration intact (verified via integration test)
**Plans**: TBD

### Phase 3: Architecture & Performance
**Goal**: Business logic is properly separated from HTTP concerns, services follow consistent naming, database schema migrations are version-controlled, and penalty processing is race-condition-free with optimal performance.
**Depends on**: Phase 2
**Requirements**: TECH-03, TECH-05, TECH-07, DEPS-02, PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. `PocketMoneyController` handlers are thin (~30 lines each), with all business logic extracted to `pocket-money.service.ts`
  2. All service files follow `dot.case.ts` naming convention; dead `notificationService.ts` is deleted
  3. `prisma migrate deploy` runs successfully in Docker entrypoint on both fresh and existing databases without data loss
  4. Overdue penalty processing uses atomic `$transaction` — concurrent `applyOverduePenalty` calls cannot produce double-penalties
  5. Penalty notification flow completes faster than before (N+1 queries eliminated via batch parent lookups, parallel processing via `Promise.allSettled`)
**Plans**: TBD

### Phase 4: Test Coverage & Gates
**Goal**: Comprehensive test coverage across backend controllers, services, penalty edge cases, and frontend components — with CI coverage gates preventing future regression.
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. All 15 controllers have unit tests (services mocked, never Prisma) passing at configured coverage thresholds
  2. All 8 previously untested services have unit tests covering happy-path, error, and null-return cases at ≥90% coverage
  3. Overdue penalty `$transaction` atomicity and edge cases (timezone boundaries, integer rounding) are verified by dedicated tests
  4. Frontend test coverage reaches 50% (from 22%), with hooks and high-impact pages tested via Vitest + React Testing Library
  5. CI pipeline fails when any coverage threshold drops below configured levels in `jest.config.js` and `vitest.config.ts`
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Cleanup | 3/4 | In progress | - |
| 2. Prisma Modernization | 0/TBD | Not started | - |
| 3. Architecture & Performance | 0/TBD | Not started | - |
| 4. Test Coverage & Gates | 0/TBD | Not started | - |
