# Phase 1: Foundation & Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 01-remediate-codebase-concerns
**Areas discussed:** Type safety approach (as any), Dependency upgrade strategy (npm audit), Console gating approach (frontend)

---

## Type Safety Approach (`as any`)

### CSRF retry typing (client.ts)

| Option | Description | Selected |
|--------|-------------|----------|
| Local shadow types | Define `CsrfRetryConfig` interface extending Axios config, typed error shape for AxiosError.data. No global pollution. | ✓ |
| Global Declaration merging | `declare module 'axios'` to extend types globally. Clean call sites but adds magic behavior everywhere. | |
| WeakMap for retry count | Store retry count in module-level WeakMap keyed by request. No type extension needed but more complex. | |

**User's choice:** Local shadow types (Recommended)

### Prisma error typing (errorHandler.ts)

| Option | Description | Selected |
|--------|-------------|----------|
| instanceof type guard | Import `PrismaClientKnownRequestError` from @prisma/client/runtime/library. Idiomatic, zero casts. | ✓ |
| Duck-typed check | Check `err.name` and `'code' in err` with type guard. Avoids importing Prisma runtime. | |
| Leave for Phase 2 | Defer until $extends migration resolves database.ts cast too. | |

**User's choice:** instanceof type guard (Recommended)

**Note:** database.ts `as any` cast (line 29) deferred to Phase 2 — resolves automatically with TECH-02 Prisma $extends migration.

---

## Dependency Upgrade Strategy

### Audit fix aggressiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Selective fix | `npm audit fix` without --force first, then manual handling for HIGH items with overrides or targeted bumps. | ✓ |
| Full force fix | `npm audit fix --force` in both packages, accepting potential breaking changes. | |
| Manual only | Manual version bumps with changelog review per package. | |

**User's choice:** Selective fix (Recommended)

### lodash (HIGH, transitive)

| Option | Description | Selected |
|--------|-------------|----------|
| overrides | Add `overrides` in frontend/package.json to force lodash >= 4.17.21. Standard npm approach. | ✓ |
| Skip lodash | Accept audit warning, wait for parent package update. | |
| Replace lodash | Replace any direct usage with native alternatives and remove dependency. | |

**User's choice:** overrides (Recommended)

---

## Console Gating Approach

### Debug flag mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time | `import.meta.env.VITE_DEBUG` or `import.meta.env.DEV`. Dead code elimination strips calls from production bundle. | ✓ |
| Runtime window.APP_CONFIG | Check `window.APP_CONFIG?.debug` like client.ts does now. Allows production toggle without rebuild. | |
| Hybrid | Dev auto-on via DEV, production gated by APP_CONFIG.debug. More complex. | |

**User's choice:** Build-time (Recommended)

### Utility shape

| Option | Description | Selected |
|--------|-------------|----------|
| Drop-in log/error/warn | Export `debugLog`, `debugError`, `debugWarn` functions. Simple find/replace refactoring. | ✓ |
| Tagged logger factory | `createDebugLogger(prefix)` factory with prefix baked in. More structured, reusable. | |
| Minimal: gate errors only | Gate only the 14 unconditional console.error in catch blocks. Leave rest as-is. | |

**User's choice:** Drop-in log/error/warn (Recommended)

---

## the agent's Discretion

- Exact naming and shape of local shadow type interfaces in client.ts
- Whether debug.ts gates on `import.meta.env.DEV` or `import.meta.env.VITE_DEBUG`
- Exact lodash version floor in overrides (≥4.17.21)
- Order of npm audit fix operations (backend first vs frontend first)
- Exact if/else structure for BUGS-01 nested ternary replacement

## Deferred Ideas

None — discussion stayed within phase scope.
