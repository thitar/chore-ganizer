# Project Research Summary

**Project:** Chore-Ganizer Codebase Health & Quality Remediation
**Domain:** Express.js + React + SQLite chore management platform — test coverage expansion, debt elimination, production hardening
**Researched:** 2026-05-01
**Overall confidence:** HIGH

## Executive Summary

This remediation targets a production-grade chore management application (Express.js + React 18 + Prisma/SQLite) that has accumulated technical debt: deprecated Prisma middleware blocking version upgrades, TypeScript `as any` casts compromising type safety, a fat controller (817 lines) with untestable business logic, 22% frontend test coverage, and a `prisma db push` deployment path that risks data loss. Four parallel researcher agents analyzed the codebase and all deliver HIGH-confidence findings — the path forward is well-understood with no ambiguous decisions.

The recommended approach is a **layered, dependency-ordered remediation**: eliminate the Prisma `$use` middleware bottleneck first (unblocks all Prisma upgrades), clean up `as any` casts and npm vulnerabilities in parallel (low-risk warm-up), extract the PocketMoneyService to make business logic testable (prerequisite for controller tests), then expand test coverage from the inside out (services → controllers → hooks → components), switch from `db push` to `migrate deploy` for production safety, and finally upgrade Prisma to the latest stable 6.x. Research is unanimous that the existing test infrastructure (`test-helpers.ts`, `createPrismaMock()`, integration DB lifecycle) is robust and should be leveraged rather than reinvented.

Key risks center on **sequencing**: writing controller tests before service extraction guarantees they break (PITFALLS #1, flagged by all four researchers), upgrading Prisma before migrating away from `$use` crashes the app on startup, and fake timer leakage can produce cryptic test failures across files. These are all preventable through disciplined phase ordering and code review checklists. The single biggest decision point is whether to run some phases in parallel (npm audit + service extraction can overlap) or strictly serial — the research supports parallel execution for independent workstreams with different team members.

## Key Findings

### Recommended Stack Changes

From STACK.md — five concrete codebase changes with verified approaches:

**Must-do (all HIGH confidence):**

| Change | Rationale |
|--------|-----------|
| **Prisma `$use` → `$extends`** query extension on `RecurringChore` model | `$use` is removed in Prisma 6+. A fully typed `$extends` query extension handles JSON serialize/deserialize for SQLite's lack of JSON column type. Intercepts all read operations (including `findFirstOrThrow`/`findUniqueOrThrow` which are easy to miss). Zero `as any` casts. |
| **Eliminate 3 remaining `as any` casts** | `client.ts` CSRF retry (→ typed `CsrfRetryConfig` interface), `errorHandler.ts` Prisma error (→ `instanceof PrismaClientKnownRequestError`), `database.ts` (→ eliminated by `$extends` migration). Enable `@typescript-eslint/no-explicit-any: "error"` after cleanup. |
| **Extract `PocketMoneyService`** (named functions, not a class) | 817-line controller with 27 `prisma` calls and inline business logic. Follow existing `dot.case.ts` service convention. Move balance calculations, pagination, transaction creation to service. Controller becomes ~30 lines per handler — thin HTTP layer. |
| **`prisma db push` → `prisma migrate deploy`** | `db push` can drop/recreate tables (data loss). Generate baseline migration from current schema, update Docker entrypoint to `prisma migrate deploy`. On fresh DBs, migrations apply in order; on existing DBs, only pending migrations run. |
| **npm audit fixes** (backend: 6 vulns, frontend: 6 vulns) | Axios (SSRF — LOW impact), nodemailer (SMTP injection — LOW), vite (path traversal — MEDIUM, dev-only), uuid (buffer bounds — MEDIUM, needs `--force` for v14 breaking change), lodash (prototype pollution — LOW). All fixable with `npm audit fix` except uuid needs `--force`. |

**Deferred:**
- Prisma 7 upgrade (still in development — 7.9.0-dev). Stay on 6.19.3 (latest stable 6.x).

### Expected Features (Test Coverage Expansion)

From FEATURES.md — what to build and in what priority:

**Table stakes (must-do for milestone completion):**

1. **Controller unit tests for 5 highest-impact controllers** — `chore-assignments` (parameter mapping), `recurring-chores-occurrences` (nested ternary extraction), `pocket-money` (AFTER extraction), `overdue-penalty` (trigger params), `recurring-chores-crud` (CRUD validation). Mock services, never Prisma.

2. **Service unit tests for 4 highest-risk untested services** — `transform.service.ts` (type safety), `occurrence-management.service.ts` (data validation error path), `occurrence.service.ts` (occurrence generation), `recurring-chore-management.service.ts` (CRUD + round-robin). Mock Prisma via `createPrismaMock()`.

3. **Overdue penalty `$transaction` coverage** — `processAllOverdue` with mocked `$transaction`, concurrent penalty prevention test (two simultaneous `applyOverduePenalty` calls — second must throw).

4. **Frontend test expansion (22% → 50%)** — prioritize hooks (`useChores`, `usePocketMoney`), then high-impact pages (`PocketMoney`, `RecurringChores`, `Notifications`). Smoke tests first (renders, shows loading), then behavior tests (form validation, error display).

**Differentiators (high value, deferrable if time-constrained):**

5. **Coverage gates in CI** — `coverageThreshold` in jest.config.js: global 70%, services 90%, controllers 80%, middleware 95%.
6. **Race condition simulation tests** — concurrent penalty processing, concurrent point transactions (verify atomicity).
7. **Snapshot testing for API contracts** — stable endpoints only, use `expect.objectContaining()` for dynamic fields.

**Already adequate (no additional work needed):**
- CSRF retry logic tests (5 tests in `client.test.ts` cover all scenarios)
- 401 auto-logout tests (tested in `client.test.ts` and `useAuth.test.tsx`)
- Additional integration tests (4 existing files cover core flows)

### Architecture Approach

From ARCHITECTURE.md — layered isolation testing pyramid:

```
E2E (Playwright) → Real browser, real server, real SQLite
Integration (Jest + real DB) → Express → service → Prisma → DB
Controller Unit Tests (Jest, mock services) → Request parsing → response format
Service Unit Tests (Jest, mock Prisma) → Business logic → Prisma queries
Middleware Tests (Jest, mock req/res) → Auth/CSRF/rate limiting
Frontend Components (Vitest + RTL) → Render → interaction → DOM assertions
Frontend Hooks (Vitest + renderHook) → Mock API → state transitions
```

**Key architecture rules (from all four researchers):**

1. **Controllers mock services, never Prisma.** Controller's job: parse HTTP input, call service, format HTTP output. Service's job: business logic, Prisma interaction.
2. **Services use `createPrismaMock()` from test-helpers.** Includes all models — won't break when new models are added. Never manually construct Prisma mocks.
3. **Fake timers ALWAYS restored:** `afterEach(() => { jest.useRealTimers() })` in every file using `jest.useFakeTimers()`. Process-global scope in Jest means leakage affects other test files.
4. **Assert behavior, not implementation:** For services, test return values and side effects, not exact Prisma query arguments (except for `$transaction` wrapping and RBAC `where` clauses — those are behavioral).
5. **Never test `Date.now()` directly:** Use `jest.useFakeTimers()` + `jest.setSystemTime()`. The overdue-penalty tests are the reference implementation.

### Critical Pitfalls

From PITFALLS.md — ranked by severity:

1. **Controller tests mocking Prisma instead of services** (CRITICAL) — Tests break when service is extracted. Wastes effort. Creates false confidence. **Prevention:** Mock services only. For pocket-money, write tests AFTER TECH-03 extraction. Add code review checklist rule.

2. **Writing tests without reading `test-helpers.ts`** (CRITICAL) — Manual mock construction misses `createPrismaMock()`, fixture factories, mock request/response helpers. Tests become brittle and inconsistent. **Prevention:** Document helpers as required import. Add test template file. Reject PRs that bypass helpers.

3. **Fake timer cleanup forgotten** (CRITICAL) — `jest.useFakeTimers()` is process-global. Without `jest.useRealTimers()` in `afterEach`, subsequent tests hang with cryptic timeout errors. **Prevention:** Template every test file with the cleanup. Consider safety net in `jest-setup.ts`.

4. **Overly specific Prisma query assertions** (MODERATE) — Asserting `select`, `orderBy`, `include` in service tests. Query optimizations break tests despite identical behavior. **Prevention:** Assert output/behavior. Reserve exact query assertions for `$transaction` (atomicity) and RBAC `where` clauses (security).

5. **`vi.mock` hoisting conflicts** (MODERATE) — Vitest hoists `vi.mock()` above imports. Creates TypeScript confusion between real and mocked module types. **Prevention:** Follow `client.test.ts` pattern exactly — mock the module, import the mock, don't try to import and spy on the same module.

## Implications for Roadmap

Based on combined research, the following phase structure respects all discovered dependencies, avoids all identified pitfalls, and groups related work for efficient execution:

### Phase 1: Prisma Middleware Migration (`$use` → `$extends`)
**Rationale:** Prerequisite for Prisma version upgrades. No other change depends on this, but it blocks Prisma 6.x. Must be done before any Prisma version bump. The `$extends` API is fully available in current 5.22.0 — no version change needed for this phase.

**Delivers:** New `database.ts` using `$extends` query extension with full type safety, zero `as any` casts. All 5 write operations (create, update, upsert, createMany, updateMany) + 5 read operations (findUnique, findFirst, findMany, findUniqueOrThrow, findFirstOrThrow) properly handling JSON serialization.

**Addresses:** STACK §1 (Prisma middleware), STACK §4 (eliminates `as any` in database.ts), PITFALLS requirement to have typed Prisma interactions before service tests.

**Avoids:** Do NOT upgrade Prisma in this phase. Do NOT use `result` extension (wrong API). Do NOT skip `findFirstOrThrow`/`findUniqueOrThrow` methods.

**Research flag:** Standard pattern — Prisma docs are excellent. Skip `/gsd-research-phase`.

### Phase 2: Type Safety Cleanup (`as any` Elimination + npm Audit)
**Rationale:** Independent workstreams with no blocking dependencies. Low-risk changes that warm up the codebase. The `as any` elimination in `errorHandler.ts` and `client.ts` is purely type-level — no behavior changes. npm audit fixes are mechanical (`npm audit fix`) with minimal testing needed. These can run in parallel.

**Delivers:** Zero `as any` casts in codebase. `@typescript-eslint/no-explicit-any: "error"` enabled in ESLint config. All 12 vulnerabilities resolved (6 backend, 6 frontend). Clean `npm audit` report.

**Addresses:** STACK §4 (as any elimination), STACK §2 (npm audit), FEATURES Differentiator #4 (Axios interceptor types).

**Uses:** TypeScript type guards (`instanceof PrismaClientKnownRequestError`), Axios config extension (`CsrfRetryConfig` interface).

**Avoids:** Do NOT run `npm audit fix --force` on frontend (vite stays in 6.x). Do NOT use `// @ts-ignore` or `as unknown as` chains. Do NOT enable the ESLint rule before all casts are gone.

**Research flag:** Standard patterns — no research needed.

### Phase 3: Extract PocketMoneyService (Fat Controller Remediation)
**Rationale:** Prerequisite for controller unit tests on pocket-money (PITFALLS #1 — testing before extraction guarantees breakage). The 817-line controller with 27 `prisma` calls is the single biggest code quality issue. Extraction follows established service pattern (`dot.case.ts`, named functions, no classes). Must happen before Phase 4 controller tests.

**Delivers:** `backend/src/services/pocket-money.service.ts` with all business logic (balance calculation, pagination with running balances, transaction creation, payout period math). Refactored `pocket-money.controller.ts` (~30 lines per handler). Unit-testable service functions.

**Addresses:** STACK §3 (fat controller extraction), TECH-03 from CONCERNS.md, prerequisite for FEATURES Table Stakes #1 (controller tests).

**Uses:** Existing service conventions from `overdue-penalty.service.ts`, `notifications.service.ts`. Named function exports, not classes.

**Avoids:** Do NOT put authorization logic in the service (stays in controller — HTTP concern). Do NOT create a service class (project uses functions). Do NOT extract a thin passthrough wrapper — service must contain the business logic.

**Research flag:** Standard pattern — codebase has 17 service files to reference. Skip research-phase.

### Phase 4: Backend Test Coverage Expansion
**Rationale:** Largest work item. Respects dependencies: service extraction is done (Phase 3), Prisma is on `$extends` (Phase 1), service mocks and test infrastructure are ready. Expand coverage from the inside out: services → controllers → edge cases. The recurring-chores subsystem is the highest-risk untested area.

**Delivers:**
- **Wave 1 (Services):** Unit tests for `transform.service.ts`, `occurrence-management.service.ts`, `occurrence.service.ts`, `recurring-chore-management.service.ts`. Mock Prisma via `createPrismaMock()`. Test both happy path and error/null cases.
- **Wave 2 (Controllers):** Unit tests for 5 highest-impact controllers (`chore-assignments`, `recurring-chores-occurrences`, `pocket-money` POST-extraction, `overdue-penalty`, `recurring-chores-crud`). Mock services only — never Prisma. Test parameter coercion, response envelope format, authorization checks.
- **Wave 3 (Edge Cases):** Overdue penalty `$transaction` atomicity test, concurrent penalty prevention test, timezone boundary condition tests. Use `jest.useFakeTimers()` with mandatory cleanup.

**Addresses:** FEATURES Table Stakes #1, #2, #3. ARCHITECTURE Patterns #1-4. PITFALLS #1, #3, #4, #13.

**Avoids:** Mocking Prisma in controllers. Testing Prisma query details in services. Forgetting `jest.useRealTimers()`. Not testing `null` returns from `findUnique`.

**Research flag:** Needs `/gsd-research-phase` for recurring-chores occurrence generation logic testing strategy — date-heavy domain with DST/leap-year/round-robin complexity.

### Phase 5: Frontend Test Coverage Expansion
**Rationale:** No blocking dependencies on backend phases (API mocks already established). Can start in parallel with Phase 4 if team capacity allows. Prioritize hooks (highest domain logic concentration) over components (rendering concerns).

**Delivers:**
- **Wave 1 (Hooks):** Tests for `useChores`, `usePocketMoney`, `useNotifications`. Mock API modules at module level. Test loading → data → error state transitions. Wrap with AuthProvider where needed.
- **Wave 2 (Pages):** Smoke tests for top 3-4 pages (PocketMoney, RecurringChores, Notifications, Dashboard). Render without error, show loading state, display data.
- **Wave 3 (Components):** Form submission error handling, loading states for async components. Test what user sees (DOM output), not internal state.

**Addresses:** FEATURES Table Stakes #6. ARCHITECTURE Patterns #5-6. PITFALLS #5, #6.

**Uses:** `renderWithRouter` helper if available; Vitest + React Testing Library; `vi.mock` pattern from `client.test.ts`.

**Avoids:** `vi.mock` hoisting conflicts (follow client.test.ts exactly). Testing component internal state. Skipping `act()` warnings with `waitFor` overuse. Missing context providers.

**Research flag:** Standard patterns — frontend test infrastructure is documented in `client.test.ts` and `useAuth.test.tsx`. Skip research-phase but users may want `/gsd-ui-phase` for page-level test design contracts.

### Phase 6: Production Database Safety (`db push` → `migrate deploy`)
**Rationale:** Requires coordination with Docker entrypoint and manual testing to ensure no data loss. Should be a dedicated phase with a rollback plan. The current `db push` approach can drop/recreate tables — this is a production safety issue.

**Delivers:** Baseline migration (`20260501_baseline/migration.sql`). Updated `docker-entrypoint.sh` using `prisma migrate deploy`. Migration lock file. Documented workflow for future schema changes (`prisma migrate dev --name`).

**Addresses:** STACK §5 (migration strategy). Production safety concern from CONCERNS.md.

**Avoids:** Do NOT delete existing migrations. Do NOT run `migrate dev` in production. Do NOT use `db push` as fallback if deploy fails — fix the migration. Do NOT skip `migration_lock.toml`.

**Research flag:** Needs `/gsd-research-phase` — the `prisma migrate diff` baseline approach for existing databases running `db push` requires careful validation. Test on a copy of production data before deploying.

### Phase 7: Prisma Version Upgrade (5.22.0 → 6.19.3)
**Rationale:** LAST phase — only after `$extends` migration is tested (Phase 1), test coverage is expanded (Phases 4-5), and database migration is safe (Phase 6). Prisma 6 removes `$use` entirely, but we no longer use it. Full test suite must pass before declaring success.

**Delivers:** Prisma and @prisma/client at 6.19.3. Regenerated Prisma client. All tests passing (unit + integration + E2E).

**Addresses:** STACK §1 (Prisma upgrade path). Unblocks future Prisma 7.x upgrades.

**Uses:** Prisma 6.19.3 release notes for breaking changes. Run `prisma generate` after upgrade.

**Avoids:** Do NOT jump to Prisma 7.x (still in development). Do NOT skip full test suite run. Do NOT upgrade before Phase 1 `$extends` migration is verified.

**Research flag:** Standard upgrade — skip research-phase.

### Phase 8: Coverage Gates & Quality Lock-In
**Rationale:** Final lock-in step. After all coverage is written, set CI gates to prevent regression. This is the "never go back" moment.

**Delivers:** `coverageThreshold` in `jest.config.js` (global 70%, services 90%, controllers 80%, middleware 95%). CI workflow configured to fail on coverage drops. ESLint `no-explicit-any: error` verified clean. Snapshot tests disabled from auto-update in CI.

**Addresses:** FEATURES Differentiator #5. PITFALLS #8 (snapshot auto-updates). All CONCERNS.md items closed.

**Research flag:** Standard CI config — skip research-phase.

### Phase Ordering Rationale

- **Phase 1 first** because Prisma `$extends` is the bottleneck — Prisma 6 removes `$use`, so this must be done before any Prisma upgrade. Also eliminates one of three `as any` casts.
- **Phases 2-3 can overlap** if team capacity allows (different files, no shared state). Both are independent of each other.
- **Phase 4 depends on Phase 3** for pocket-money controller tests. Attempting controller tests before extraction is PITFALLS #1 — the #1 risk flagged by all researchers.
- **Phases 4-5 can overlap** (backend and frontend test expansion touch different codebases, different test runners). Parallelize if multiple developers available.
- **Phase 6 is isolated** — requires dedicated attention with manual testing. No other phase writes to the production deployment path.
- **Phase 7 is gated on Phase 1 + Phase 4** — must have `$extends` migrated AND test coverage to catch regressions.
- **Phase 8 is always last** — gates lock in what you've built. Premature gates cause build failures.

### Research Flags

**Needs `/gsd-research-phase` during planning:**
- **Phase 4 (Backend Tests):** Recurring-chores occurrence generation testing strategy. This is a date-heavy domain with DST, leap years, round-robin rotation, and mixed assignment modes. The correct testing approach (fake timers, property-based testing, deterministic recurrence) needs research before planning.
- **Phase 6 (Database Migration):** `prisma migrate diff` baseline strategy for existing `db push` databases. Need to research: does `--from-empty` produce a correct baseline? How does `migrate resolve` interact with Docker entrypoints? Test on production data copy.

**Skip `/gsd-research-phase` (standard patterns):**
- **Phase 1:** Prisma `$extends` is well-documented. STACK.md provides complete reference implementation.
- **Phase 2:** TypeScript type guards and npm audit are mechanical operations.
- **Phase 3:** Service extraction follows established codebase patterns (17 existing service files).
- **Phase 5:** Frontend testing patterns documented in `client.test.ts` and `useAuth.test.tsx`.
- **Phase 7:** Prisma upgrade is standard version bump with test suite verification.
- **Phase 8:** CI coverage gates are standard configuration.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Verified against Prisma docs (Context7), npm registry, GitHub Advisory Database, and actual codebase files with line numbers. Prisma `$extends` implementation code provided and validated against existing middleware behavior. |
| Features | **HIGH** | Verified against actual test infrastructure (`test-helpers.ts` examined, 21 backend test files counted, 18 frontend test files counted, `CONCERNS.md` cross-referenced). Identified features that are already tested (CSRF, 401 logout) vs. genuinely missing. |
| Architecture | **HIGH** | Verified against existing test file structure and conventions. All 6 recommended patterns have reference implementations in the codebase. Anti-patterns identified from real testing fragility sources. |
| Pitfalls | **HIGH** | Based on examination of existing test infrastructure (`overdue-penalty.service.test.ts` line 104 for timer cleanup, `client.test.ts` for vi.mock pattern, integration test DB lifecycle). Pitfalls are specific and actionable with prevention strategies for each. |

**Overall confidence: HIGH** — All four research files cite specific files, line numbers, and verified existing patterns. No speculative or inferred findings. The codebase was actively examined, not just described from documentation.

### Gaps to Address

Research is comprehensive for this milestone. Gaps are tactical and should be resolved during phase planning:

- **Recurring-chores occurrence testing strategy (Phase 4):** The STACK and FEATURES researchers identified this as the highest-complexity testing domain. During Phase 4 planning, run `/gsd-research-phase` to determine: (a) whether to use property-based testing for recurrence rules, (b) how to structure fake-timer tests for DST/leap-year boundaries without test interdependence, (c) how to verify round-robin fairness deterministically.
- **`prisma migrate diff` baseline for existing `db push` databases (Phase 6):** STACK §5 provides the approach but notes it needs validation. During Phase 6 planning, research: (a) whether `--from-empty --to-schema-datamodel` captures the exact current schema including implicit many-to-many tables, (b) how `migrate resolve --applied` interacts with Docker entrypoints on fresh vs. existing databases, (c) whether SQLite-specific migration concerns (no ALTER COLUMN) affect the baseline.
- **Performance impact of expanded test suite:** Current tests run ~30s backend + ~15s frontend. After remediation, estimate ~60s + ~30s. If this exceeds CI timeout, test sharding or parallel suites may be needed — should be validated after Phase 4-5 execution.

## Sources

### Primary (HIGH confidence — all verified against codebase)

- **Context7: Prisma documentation** — `$extends` query extension API, `migrate deploy` vs `db push`, Prisma v6 breaking changes (STACK §1, §5)
- **npm registry** — axios@1.15.2, nodemailer@8.0.7, lodash@4.18.1, vite@6.4.3, uuid@14.0.0 (STACK §2)
- **GitHub Advisory Database** — GHSA-r4q5-vmmm-2653 (follow-redirects), GHSA-vvjj-xcjg-gr5g (nodemailer), GHSA-4w7w-66w2-5vf9 (vite), GHSA-f23m-r3pf-42rh (lodash) (STACK §2)
- **Codebase analysis** — `backend/src/config/database.ts` (STACK §1), `backend/src/controllers/pocket-money.controller.ts` (STACK §3), `backend/src/__tests__/test-helpers.ts` (ARCHITECTURE, PITFALLS), `backend/src/__tests__/services/overdue-penalty.service.test.ts` (FEATURES, PITFALLS), `frontend/src/api/client.test.ts` (FEATURES, PITFALLS), `frontend/src/hooks/useAuth.test.tsx` (FEATURES), `backend/docker-entrypoint.sh` (STACK §5)

### Secondary (HIGH confidence — project documentation)

- **CONCERNS.md** — Identified 15 untested controllers, 8 untested services, TECH-03 fat controller, PERF-01 race condition, DEPS-04 `as any` casts. All four researchers cross-referenced against this document.
- **PROJECT.md** — Confirmed TEST-01 through TEST-05 as active requirements for this milestone (FEATURES).
- **TESTING.md** — Existing testing conventions and patterns (FEATURES, ARCHITECTURE).

### Established Patterns (HIGH confidence — reference implementations in codebase)

- `backend/src/services/overdue-penalty.service.ts` — Service pattern for PocketMoneyService extraction
- `backend/src/services/notifications.service.ts` — Service pattern for PocketMoneyService extraction
- `backend/src/__tests__/integration/pocket-money.integration.test.ts` — Integration test DB lifecycle
- `backend/jest.integration.config.js` — Integration test infrastructure (global setup/teardown)

---

*Research completed: 2026-05-01*
*Ready for roadmap: yes*
