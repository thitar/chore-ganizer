# Phase 1: Foundation & Cleanup - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

## Phase Boundary

The codebase is free of dead code, npm vulnerabilities, type safety violations, and known bugs — a clean foundation for deeper remediation in Phases 2–4. This phase addresses 8 requirements: TECH-01 (dead file deletion), TECH-04 (`as any` elimination), TECH-06 (route mounting consistency), DEPS-01 (npm audit fix), BUGS-01 (nested ternary), BUGS-02 (type transformRecurringChore), BUGS-03 (log bad data), BUGS-04 (gate console output).

No new features. No behavior changes. Only cleanup, fixes, and hardening.

## Implementation Decisions

### Type Safety (`as any`)
- **D-01:** `frontend/src/api/client.ts` — use local shadow types. Define a `CsrfRetryConfig` interface extending `InternalAxiosRequestConfig` with `_csrfRetryCount?: number`. Define a typed error response shape for `AxiosError.data`. No global declaration merging.
- **D-02:** `backend/src/middleware/errorHandler.ts` — use `instanceof PrismaClientKnownRequestError` type guard imported from `@prisma/client/runtime/library`. Replace `const prismaError = err as any` at line 55.
- **D-03:** `backend/src/config/database.ts` (line 29) — deferred to Phase 2 (TECH-02). The `(params.args as any)` cast inside `$use` middleware resolves automatically when migrating to `$extends`.

### Dependency Strategy (`npm audit`)
- **D-04:** Selective fix — run `npm audit fix` without `--force` in both packages (covers safe non-breaking upgrades). Then manually handle remaining HIGH severity items with targeted version bumps or overrides.
- **D-05:** lodash (HIGH, transitive) — use `overrides` in `frontend/package.json` to force lodash >= 4.17.21. No need to replace lodash usage (it's transitive, not a direct dependency of frontend source).

### Console Gating (Frontend)
- **D-06:** Build-time flag — use `import.meta.env.VITE_DEBUG` or `import.meta.env.DEV` in a shared utility. Dead code elimination strips console calls from production bundles.
- **D-07:** Drop-in utility pattern — create `frontend/src/utils/debug.ts` exporting `debugLog`, `debugError`, `debugWarn` functions. Replace all 55+ direct `console.log`/`console.error`/`console.warn` calls across components, pages, hooks, and client.ts with these aliases. No factory or tagged logger — minimal refactoring.

### the agent's Discretion
- Exact naming and shape of local shadow type interfaces in `client.ts`
- Whether `debug.ts` gates on `import.meta.env.DEV` or `import.meta.env.VITE_DEBUG`
- Exact lodash version floor in `overrides` (≥4.17.21)
- Order of operations for `npm audit fix` (backend first vs frontend first)
- Exact `if/else` structure for BUGS-01 nested ternary replacement

## Canonical References

### Codebase audit & architecture
- `.planning/codebase/CONCERNS.md` — Full audit of all 22 issues across tech debt, security, performance, bugs, tests
- `.planning/codebase/ARCHITECTURE.md` — Controller→Service→Prisma pattern, middleware chain ordering, dual Prisma client anti-pattern
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, test mocking patterns, CSRF flow, parameter mapping
- `.planning/codebase/STACK.md` — Technology versions (Prisma 5.22, axios 1.14, lodash transitive, vite 6.2, nodemailer 8.0.4)

### Files to modify (TECH-04, TECH-06, BUGS-01/02/03/04)
- `frontend/src/api/client.ts` — 5 `as any` casts (lines 94, 95, 112, 118, 125), CSRF retry logic, console statements
- `backend/src/middleware/errorHandler.ts` — 1 `as any` cast (line 55), Prisma error code checking
- `backend/src/routes/recurring-chores.routes.ts` — Dead file to delete (394 lines, zero imports) — TECH-01
- `backend/src/controllers/recurring-chores-occurrences.controller.ts` — Nested ternary at line 52 — BUGS-01
- `backend/src/services/recurring-chores/transform.service.ts` — `dbRecord: any` parameter (line 5) — BUGS-02
- `backend/src/services/recurring-chores/occurrence-management.service.ts` — `safeParseAssignedUserIds` error path (lines 4–9) — BUGS-03
- `backend/src/app.ts` — metricsRoutes direct mount at line 156 — TECH-06
- `backend/src/routes/index.ts` — Central router where metricsRoutes should be mounted — TECH-06

### Frontend console sources
- `frontend/src/pages/*.tsx` — 14 unconditional `console.error` in catch blocks
- `frontend/src/hooks/useAuth.tsx` — 15 console calls
- `frontend/src/components/**/*.tsx` — 7 console calls
- New utility: `frontend/src/utils/debug.ts` — to create

### Package manifests
- `backend/package.json` — npm audit fix target
- `frontend/package.json` — npm audit fix target, lodash overrides

## Existing Code Insights

### Reusable Assets
- Existing `debugEnabled` pattern in `client.ts` line 20 — proves the conditional console pattern works, can be extracted to shared utility
- `import.meta.env.DEV` / `import.meta.env.VITE_DEBUG` already available in Vite — no new env var needed
- `@prisma/client/runtime/library` already a dependency — `PrismaClientKnownRequestError` is importable without new packages

### Established Patterns
- Route mounting: all routes go through `routes/index.ts` — TECH-06 aligns with convention (move metricsRoutes from app.ts)
- Service file naming: `dot.case.ts` is dominant (13 of 17 services) — nothing to change in Phase 1
- Axios interceptor chain in `client.ts` — local shadow types integrate cleanly without restructuring

### Integration Points
- `routes/index.ts` imports all other route files — metricsRoutes will join this barrel
- `client.ts` interceptor and `errorHandler.ts` are the only two files with `as any` in production paths (database.ts deferred)
- Console statements are scattered across 12+ files — `debug.ts` utility touches all of them

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 01-remediate-codebase-concerns*
*Context gathered: 2026-05-02*
