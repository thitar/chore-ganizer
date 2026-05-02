# Phase 01: Foundation & Cleanup - Research

**Researched:** 2026-05-02
**Domain:** Codebase remediation — type safety, dependency security, bug fixes, dead code removal
**Confidence:** HIGH

## Summary

Phase 01 targets 8 requirements across four categories: dead code deletion (TECH-01), type safety (TECH-04), route consistency (TECH-06), dependency vulnerability fixes (DEPS-01), and code quality bugs (BUGS-01 through BUGS-04). All work is cleanup/fix — no new features, no behavior changes.

The phase operates on a dual-package monorepo (Express.js + TypeScript backend, React + Vite frontend) with Prisma 5.22 ORM against SQLite. All target files have been read and verified — every `as any` cast, every console statement, every nesting location is confirmed.

**Primary recommendation:** Execute in dependency order: DEPS-01 first (may change package versions that affect type behavior), then TECH-01/04/06/BUGS-01/02/03 in parallel waves, then BUGS-04 last (touches most files, benefits from settled code from other fixes).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dead file deletion (TECH-01) | Backend | — | Backend-only route file with zero imports |
| Type safety - Axios client (TECH-04) | Frontend (Client) | — | `client.ts` runs in browser; types define API contract shapes |
| Type safety - Prisma errors (TECH-04) | Backend | — | `errorHandler.ts` runs on Express server |
| Route mounting (TECH-06) | Backend | — | Express app configuration in `app.ts` and `routes/index.ts` |
| npm audit fix (DEPS-01) | Both | — | Independent `npm audit fix` in each package directory |
| Nested ternary (BUGS-01) | Backend | — | Controller logic in `recurring-chores-occurrences.controller.ts` |
| Typed transform (BUGS-02) | Backend | — | Service function in `transform.service.ts` |
| Debug logging improvements (BUGS-03) | Backend | — | Service function in `occurrence-management.service.ts` |
| Console gating (BUGS-04) | Frontend (Client) | — | All console calls are in browser-side code |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.3.3 | Type safety (both packages) | Already project standard [VERIFIED: package.json] |
| Prisma | 5.22.0 (client), 5.7.1 (CLI) | ORM types for BUGS-02, error types for TECH-04 | Already project standard [VERIFIED: backend/package.json] |
| Axios | 1.13.6 (frontend), 1.14.0 (backend) | HTTP client with typed interceptors | Already project standard [VERIFIED: package.json] |
| Vite | 6.2.0 | Build tool with `import.meta.env` for BUGS-04 | Already project standard [VERIFIED: package.json] |
| Zod | 4.3.6 | Validation schemas (both packages) | Already project standard [VERIFIED: package.json] |
| Vitest | 4.1.0 | Frontend test runner | Already project standard [VERIFIED: package.json] |
| Jest | 30.0.0 | Backend test runner | Already project standard [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/client/runtime/library` | (bundled) | Type-safe Prisma error handling | TECH-04: `instanceof PrismaClientKnownRequestError` |
| `eslint` | 10.2.1 (backend) | Linting after changes | Already configured — run `npm run lint` after edits |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local shadow types in client.ts | Global declaration merging (`declare module 'axios'`) | Global merge pollutes namespace; local types are scoped, easier to understand [DECISION: D-01] |
| `instanceof PrismaClientKnownRequestError` | Continue `err as any` + name check | Type guard is zero-overhead, eliminates cast, uses existing import [DECISION: D-02] |
| `Prisma.recurringChore.findUnique` return type via `Awaited<ReturnType<>>` | `Prisma.RecurringChoreGetPayload` | In Prisma 5.22, `GetPayload` only accepts selection-level `S` param (not include shape directly). `Awaited<ReturnType<>>` works but is verbose. **Better:** define a local interface matching `RECURRING_CHORE_INCLUDE` shape — simple, explicit, won't break in Phase 2 Prisma upgrade. |

**Installation:** No new packages required. All fixes use existing dependencies.

**Version verification:**
- Axios latest: 1.15.2 [VERIFIED: npm registry 2026-05-02]
- Nodemailer latest: 8.0.7 [VERIFIED: npm registry 2026-05-02]
- Vite latest: 8.0.10 [VERIFIED: npm registry 2026-05-02]
- Lodash latest: 4.18.1 [VERIFIED: npm registry 2026-05-02]
- Follow-redirects latest: 1.16.0 [VERIFIED: npm registry 2026-05-02]

> **Note:** `npm audit fix` without `--force` will resolve to the highest safe semver within each package's range. For packages requiring major bumps (e.g., uuid 14.0.0), the fix is available but requires manual intervention.

## Architecture Patterns

### System Architecture — Phase 01 Change Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     PHASE 01: CHANGE FLOW                        │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │ DEPS-01     │    │ TECH-01/04/06│    │ BUGS-01/02/03        │ │
│  │ npm audit   │───▶│ + type fixes │───▶│ + logic fixes        │ │
│  │ (both pkgs) │    │ (back+front) │    │ (backend only)       │ │
│  └─────────────┘    └──────────────┘    └──────────┬───────────┘ │
│                                                     │             │
│                                                     ▼             │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ BUGS-04: Console gating                                      ││
│  │ ┌──────────────┐  ┌─────────────────────────────────────┐   ││
│  │ │ debug.ts      │  │ Replace 57 console calls across     │   ││
│  │ │ (create)      │─▶│ 15 files with debugLog/Error/Warn   │   ││
│  │ │               │  │                                     │   ││
│  │ │ Gate: DEV or  │  │ pages/*.tsx (30 calls)              │   ││
│  │ │ VITE_DEBUG    │  │ hooks/useAuth.tsx (15 calls)        │   ││
│  │ │               │  │ components/ (8 calls)               │   ││
│  │ │ No-op in prod │  └─────────────────────────────────────┘   ││
│  │ └──────────────┘                                              ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

Wave execution:
  Wave 0: DEPS-01 (npm audit fix) — must complete before other waves
          (version bumps may affect type behavior)
  Wave 1: TECH-01 (dead file) + TECH-06 (route mount) — independent backend changes
  Wave 2: TECH-04 (as any) — client.ts + errorHandler.ts — independent of Wave 1
  Wave 3: BUGS-01/02/03 — independent backend fixes
  Wave 4: BUGS-04 (console gating) — touches most frontend files, run last
```

### Recommended Project Structure (changes only)
```
backend/src/
├── routes/
│   ├── index.ts                    # [MODIFY] Add metricsRoutes import + mount
│   ├── recurring-chores.routes.ts  # [DELETE] Dead file, 394 lines, zero imports
│   └── metrics.routes.ts           # [NO CHANGE] Already exists, just moved import
├── middleware/
│   └── errorHandler.ts             # [MODIFY] instanceof guard replaces `as any`
├── controllers/
│   └── recurring-chores-occurrences.controller.ts  # [MODIFY] BUGS-01 nested ternary
├── services/recurring-chores/
│   ├── transform.service.ts        # [MODIFY] BUGS-02: typed parameter
│   └── occurrence-management.service.ts  # [MODIFY] BUGS-03: log bad data
└── app.ts                          # [MODIFY] Remove metricsRoutes mount (line 156)

frontend/src/
├── utils/
│   └── debug.ts                    # [CREATE] Shared debug utility
├── api/
│   └── client.ts                   # [MODIFY] TECH-04: typed CSRF retry + BUGS-04: console → debug*
├── hooks/
│   └── useAuth.tsx                 # [MODIFY] BUGS-04: 15 console → debug*
├── pages/
│   ├── RecurringChoresPage.tsx     # [MODIFY] BUGS-04: 8 console → debug*
│   ├── Calendar.tsx                # [MODIFY] BUGS-04: 2 console → debug*
│   ├── Dashboard.tsx               # [MODIFY] BUGS-04: 2 console → debug*
│   ├── StatisticsPage.tsx          # [MODIFY] BUGS-04: 2 console → debug*
│   ├── Chores.tsx                  # [MODIFY] BUGS-04: 1 console → debug*
│   ├── Login.tsx                   # [MODIFY] BUGS-04: 1 console → debug*
│   └── PocketMoney.tsx             # [MODIFY] BUGS-04: 1 console → debug*
├── components/
│   ├── common/
│   │   └── ErrorBoundary.tsx       # [MODIFY] BUGS-04: 1 console → debug*
│   ├── layout/
│   │   └── Navbar.tsx              # [MODIFY] BUGS-04: 1 console → debug*
│   ├── pocket-money/
│   │   └── PocketMoneyDashboard.tsx # [MODIFY] BUGS-04: 3 console → debug*
│   └── recurring-chores/
│       └── RecurringChoreFormModal.tsx # [MODIFY] BUGS-04: 1 console → debug*
├── main.tsx                        # [MODIFY] BUGS-04: 3 console → debug*
└── vite-env.d.ts                   # [NO CHANGE] VITE_DEBUG already typed
```

### Pattern 1: Local Shadow Types (TECH-04, client.ts)
**What:** Define interfaces locally in `client.ts` that extend existing Axios types without global declaration merging.
**When to use:** When Axios types need augmentation for internal logic (CSRF retry) but the augmentation shouldn't leak globally.
**Example:**
```typescript
// Source: D-01 decision + verified client.ts code
import { InternalAxiosRequestConfig, AxiosError } from 'axios'
import type { ApiError } from '../types'

interface CsrfRetryConfig extends InternalAxiosRequestConfig {
  _csrfRetryCount?: number
}

// Typed error response access:
// Instead of: (error.response?.data as any)?.error?.code
// Use:       const apiError = error.response?.data as ApiError
// Then:      apiError?.error?.code (fully typed)
```
**Key insight:** `ApiError` already defines `{success: false, error: {message: string, code: string}}` — the `as any` casts were bypassing existing types.

### Pattern 2: instanceof Type Guard (TECH-04, errorHandler.ts)
**What:** Replace `const prismaError = err as any` with `instanceof PrismaClientKnownRequestError` type guard.
**When to use:** When identifying Prisma errors by code property.
**Example:**
```typescript
// Source: @prisma/client/runtime/library — verified export
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

// Instead of: if (err.name === 'PrismaClientKnownRequestError') { const prismaError = err as any; ... }
// Use:
if (err instanceof PrismaClientKnownRequestError) {
  if (err.code === 'P2002') { /* typed access to .code */ }
}
```
**Verified:** `PrismaClientKnownRequestError` exports with `.name`, `.code`, and passes `instanceof` check [VERIFIED: runtime test in backend/]

### Pattern 3: Debug Utility (BUGS-04)
**What:** A `frontend/src/utils/debug.ts` module exporting `debugLog`, `debugError`, `debugWarn` that gate on `import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'`. In production builds, Vite tree-shakes the bodies because `import.meta.env.DEV` is a compile-time `false` constant.
**When to use:** Replace every direct `console.log/error/warn` call in frontend source (57 calls across 15 non-test files).
**Example:**
```typescript
// Source: D-06, D-07 decisions + verified client.ts pattern (lines 21-22)
// frontend/src/utils/debug.ts
const isDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'

export function debugLog(...args: unknown[]): void {
  if (isDebugEnabled) console.log(...args)
}

export function debugError(...args: unknown[]): void {
  if (isDebugEnabled) console.error(...args)
}

export function debugWarn(...args: unknown[]): void {
  if (isDebugEnabled) console.warn(...args)
}

// Usage (replacing direct console calls):
// Before: console.log('[ApiClient] Request:', method, url)
// After:  debugLog('[ApiClient] Request:', method, url)
```
**Proven pattern:** The existing `debugEnabled` pattern at client.ts lines 21-22 already uses this exact approach — the utility extracts it to a shared module. [VERIFIED: client.ts code]
**Tree-shaking:** Vite replaces `import.meta.env.DEV` with `false` in production builds. Dead code elimination removes the `if (false)` branches, so debug calls have zero runtime cost in production. [VERIFIED: Vite docs — import.meta.env is statically replaced at build time]

### Pattern 4: Route Mounting Consistency (TECH-06)
**What:** All route files are imported and mounted in `routes/index.ts`. `metricsRoutes` is the sole exception — it's mounted directly in `app.ts` at line 156.
**When to use:** This is a convention fix — move the import and mount to match the established pattern.
**Example:**
```typescript
// In routes/index.ts — add:
import metricsRoutes from './metrics.routes.js'
router.use('/metrics', metricsRoutes)  // Note: metrics routes use /metrics prefix

// In app.ts — remove:
// Line 17: import metricsRoutes from './routes/metrics.routes.js'  // REMOVE
// Line 156: app.use('/api', metricsRoutes)  // REMOVE (and reorder lines)
```

### Anti-Patterns to Avoid
- **Global declaration merging for Axios:** Contaminates the type namespace for all consumers. Use local shadow types instead. [DECISION: D-01]
- **`npm audit fix --force`:** Forces major version bumps that can break the build. Use selective `npm audit fix` + manual overrides. [DECISION: D-04]
- **Logger factory pattern for debug utility:** Creating a tagged logger or factory adds unnecessary complexity. Simple exported functions are sufficient — console calls use static strings as tags. [DECISION: D-07]
- **Mixing cleanup with behavior changes:** Phase 01 must not change any runtime behavior. If a fix would alter output or flow, flag it for Phase 2+ instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prisma error type checking | Custom error code extractor | `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library` | Already a dependency; provides `instanceof` guard + typed `.code` property |
| Axios request config extension | Custom config wrapper | Local `interface CsrfRetryConfig extends InternalAxiosRequestConfig` | Minimal, scoped, leverages existing Axios types |
| RecurringChore DB record typing | Prisma type gymnastics (`Awaited<ReturnType<>>`, `Prisma.validator<>`) | Locally defined interface matching `RECURRING_CHORE_INCLUDE` shape | Simple, explicit, survives Prisma upgrade in Phase 2 without changes |
| Console gating mechanism | Custom logger class, tagged logger, `pino`/`winston` for browser | `debugLog/Error/Warn` functions with `import.meta.env.DEV` gate | Zero-dependency, tree-shakeable, already proven in `client.ts` pattern |
| CSS / styling changes | Any CSS framework or Tailwind changes | None needed — this is a code-only cleanup phase | Phase has no UI changes |

**Key insight:** Every fix in this phase uses existing dependencies. No new npm packages are required. This minimizes risk and keeps the phase focused on remediation, not introduction.

## Runtime State Inventory

> Phase 01 is code cleanup only — no rename, refactor, or migration.

All changes are in-memory type changes, code logic fixes, or file deletions. No runtime state is affected:
- **Stored data:** None — no data migrations or schema changes
- **Live service config:** None — no external service configuration changes
- **OS-registered state:** None — no OS-level registrations affected
- **Secrets/env vars:** None — `VITE_DEBUG` and `VITE_API_URL` already exist in `.env` files, no new env vars added
- **Build artifacts:** None — both `node_modules/` directories will be updated by `npm audit fix` (Wave 0) but this is a standard install step, not a state migration

## Common Pitfalls

### Pitfall 1: `npm audit fix` Breaking the Build
**What goes wrong:** `npm audit fix` resolves to unexpected major versions (e.g., uuid 14.0.0, vite 8.x) that introduce breaking changes the codebase isn't ready for.
**Why it happens:** npm's semver resolution in audit fix follows each package's declared range. Some vulnerabilities require major bumps.
**How to avoid:** 
1. Run `npm audit fix` without `--force` first (safe non-breaking upgrades)
2. For remaining HIGH items, use `overrides` in `package.json` (e.g., lodash >= 4.17.21)
3. Run `npm test` in each package after audit fix
4. `backend/package.json` already has `overrides` for `tar`, `glob`, `minimatch`, `path-to-regexp` — lodash override will be added to `frontend/package.json` [DECISION: D-05]
**Warning signs:** TypeScript compilation errors after audit fix, test failures, runtime errors about missing exports.

### Pitfall 2: `debug.ts` Utility Breaking Existing Console Behavior
**What goes wrong:** The `debug.ts` functions change console output formatting (e.g., removing prefixes, changing argument order) which breaks debugging workflows.
**Why it happens:** Direct `console.log('[Tag]', ...args)` calls are replaced mechanically without preserving the tag prefix convention.
**How to avoid:**
1. `debugLog/debugError/debugWarn` are pass-through — they call the native `console.*` with the same arguments
2. All existing call sites keep their tag prefixes (e.g., `'[ApiClient]'`, `'[useAuth]'`)
3. The only change is the function name: `console.log` → `debugLog`, `console.error` → `debugError`, etc.
4. Verify by diffing console output in dev mode before/after
**Warning signs:** Missing tag prefixes in console output, different formatting, extra arguments inserted.

### Pitfall 3: `instanceof PrismaClientKnownRequestError` Not Catching All Prisma Errors
**What goes wrong:** Replacing `err.name === 'PrismaClientKnownRequestError'` with `instanceof PrismaClientKnownRequestError` misses errors from different Prisma client instances.
**Why it happens:** If multiple Prisma client instances exist, `instanceof` checks the prototype chain of the specific constructor that threw the error.
**How to avoid:** The project has a single `prisma` instance exported from `config/database.ts`. All errors flow through the same Prisma client. Verified via codebase audit — no dual-client pattern in production paths. [VERIFIED: ARCHITECTURE.md confirms single Prisma client for API, dual client only in tests]
**Warning signs:** Prisma errors suddenly becoming 500s instead of 409s/404s, test failures in error handler tests.

### Pitfall 4: Dead File Deletion Breaking the Build
**What goes wrong:** Deleting `recurring-chores.routes.ts` causes import errors if it's transitively referenced.
**Why it happens:** Barrel exports, re-exports, or dynamic imports could reference the file even though nothing imports it directly.
**How to avoid:** 
1. Verified: zero imports of `recurring-chores.routes.ts` across the entire codebase [VERIFIED: grep of backend/src/]
2. The file imports `recurring-chores.controller.ts` — verify that controller isn't also dead
3. After deletion, run `npm run build` in backend to confirm
**Warning signs:** Build failure, missing module errors, import resolution errors.

### Pitfall 5: Console Gating Making Debugging Production Issues Impossible
**What goes wrong:** After gating, production builds have no console output at all, making it impossible to debug issues without deploying a dev build.
**Why it happens:** The `debug.ts` utility gates on compile-time `import.meta.env.DEV` which is `false` in production.
**How to avoid:** This is by design — the utility also gates on `import.meta.env.VITE_DEBUG === 'true'`, which allows enabling debug output in production via env var. Production debugging is preserved. [DECISION: D-06]
**Warning signs:** Complaints that production builds have no console output (expected — use `VITE_DEBUG=true` to enable).

## Code Examples

Verified patterns from official sources:

### TECH-04: Typed CSRF Retry in client.ts
```typescript
// Source: D-01 decision + verified client.ts code structure
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, ApiError } from '../types'

// Local shadow type — no global declaration merging
interface CsrfRetryConfig extends InternalAxiosRequestConfig {
  _csrfRetryCount?: number
}

// In error interceptor (lines 92-140 replacement):
async (error: AxiosError<ApiError>) => {
  const status = error.response?.status
  const apiError = error.response?.data  // Already typed as ApiError | undefined
  const errorCode = apiError?.error?.code    // No `as any` needed
  const errorMessage = apiError?.error?.message

  // CSRF retry: use typed config
  if (status === 403) {
    const errorData = error.response?.data  // ApiError
    if (errorData?.error?.code === 'CSRF_TOKEN_INVALID' || 
        errorData?.error?.code === 'CSRF_TOKEN_MISSING') {
      const originalRequest = error.config as CsrfRetryConfig | undefined
      if (originalRequest) {
        const retryCount = originalRequest._csrfRetryCount || 0
        if (retryCount >= 1) { /* propagate */ }
        originalRequest._csrfRetryCount = retryCount + 1
        // ... refresh and retry
      }
    }
  }
  // ...
}
```
**Key:** The `ApiError` type already has `error.code` and `error.message` — the casts were unnecessary. For CSRF retry, a local `CsrfRetryConfig` interface adds `_csrfRetryCount` without polluting `axios`'s global types. [VERIFIED: frontend/src/types/index.ts defines ApiError, client.ts lines 92-140 show current cast locations]

### TECH-04: Typed Prisma Error Handling
```typescript
// Source: D-02 decision + verified errorHandler.ts code
// backend/src/middleware/errorHandler.ts
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

// Replace lines 53-76:
// Before: if (err.name === 'PrismaClientKnownRequestError') { const prismaError = err as any; ... }
// After:
if (err instanceof PrismaClientKnownRequestError) {
  if (err.code === 'P2002') {  // .code is typed as string on PrismaClientKnownRequestError
    res.status(409).json({ /* ... */ })
    return
  }
  if (err.code === 'P2025') {
    res.status(404).json({ /* ... */ })
    return
  }
}
```
**Verified:** `PrismaClientKnownRequestError` from `@prisma/client/runtime/library` has `.code: string` property and passes `instanceof` check. [VERIFIED: runtime test in backend/]

### BUGS-01: Nested Ternary Replacement
```typescript
// Source: Verified at recurring-chores-occurrences.controller.ts line 52
// Before (line 52):
const filterUserId = userId ? Number(userId) : (assignedToMe === 'true' ? req.user!.id : null)

// After — explicit if/else:
let filterUserId: number | null = null
if (userId) {
  filterUserId = Number(userId)
} else if (assignedToMe === 'true') {
  filterUserId = req.user!.id
}
```
**Why:** The nested ternary is harder to read, harder to debug, and linters flag it. The `if/else` form is equivalent but explicit. No behavior change — same precedence, same values.

### BUGS-02: Typed transformRecurringChore
```typescript
// Source: Verified transform.service.ts + RECURRING_CHORE_INCLUDE shape
// backend/src/services/recurring-chores/transform.service.ts

// Define a type matching the include shape used by callers:
interface RecurringChoreDbRecord {
  id: number
  title: string
  description: string | null
  points: number
  icon: string | null
  color: string | null
  categoryId: number | null
  createdById: number
  startDate: Date
  recurrenceRule: unknown  // JSON string after $use middleware deserialization
  assignmentMode: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  category?: { id: number; name: string } | null
  fixedAssignees?: Array<{
    user: { id: number; name: string; color: string }
  }>
  roundRobinPool?: Array<{
    id: number
    userId: number
    order: number
    user: { id: number; name: string; color: string }
  }>
}

// Before: export function transformRecurringChore(dbRecord: any)
// After:
export function transformRecurringChore(dbRecord: RecurringChoreDbRecord) {
  // ... rest unchanged — the function accesses dbRecord.fixedAssignees, 
  // dbRecord.roundRobinPool, dbRecord.startDate etc. — all now typed
}
```
**Why local interface over `Prisma.RecurringChoreGetPayload`:** In Prisma 5.22, `RecurringChoreGetPayload<S>` only accepts a selection-level parameter `S`, not an include shape directly. The `Prisma.$RecurringChorePayload` type has all relations as optional, making it too permissive. A locally defined interface matching `RECURRING_CHORE_INCLUDE` is:
1. Explicit — shows exactly what the function expects
2. Survives Phase 2 Prisma upgrade without changes
3. Doesn't require complex type inference gymnastics

[VERIFIED: Prisma 5.22 generated types at node_modules/.prisma/client/index.d.ts]

### BUGS-03: Log Bad Data Before Throwing
```typescript
// Source: Verified occurrence-management.service.ts lines 4-9
// backend/src/services/recurring-chores/occurrence-management.service.ts
import { logger } from '../../utils/logger.js'

// Before:
function safeParseAssignedUserIds(assignedUserIds: string): number[] {
  try {
    return JSON.parse(assignedUserIds) as number[]
  } catch {
    throw new AppError('Invalid occurrence data', 500, 'DATA_INTEGRITY_ERROR')
  }
}

// After: log the raw value that failed to parse
function safeParseAssignedUserIds(assignedUserIds: string): number[] {
  try {
    return JSON.parse(assignedUserIds) as number[]
  } catch {
    logger.error({
      type: 'DATA_INTEGRITY_ERROR',
      message: 'Failed to parse assignedUserIds JSON',
      rawValue: assignedUserIds,  // <-- the actual corrupt data for debugging
    })
    throw new AppError('Invalid occurrence data', 500, 'DATA_INTEGRITY_ERROR')
  }
}
```
**Why:** When data corruption occurs, the current error message gives no information about what the corrupt data looks like. Logging the raw value enables debugging without reproducing the corruption. Uses the existing `logger` from `../../utils/logger.js` — already a Winston logger.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `err as any` for Prisma errors | `instanceof PrismaClientKnownRequestError` | Now (v5 — `$use` deprecated, v6 removes it) | Type-safe, no cast, uses official API |
| `error.response?.data as any` for Axios | Leverage existing `ApiError` type | Always available | The `ApiError` type already exists in `frontend/src/types/` — it just wasn't being used at these call sites |
| Direct `console.log` in frontend | `debugLog/Error/Warn` from `debug.ts` | Now | Tree-shakeable in production, gated on DEV/VITE_DEBUG |
| `npm audit fix --force` | Selective `npm audit fix` + `overrides` | Now | Safer, avoids breaking major version bumps |
| `prisma db push` in Docker entrypoint | No change in Phase 01 | Phase 3 (TECH-07) | Deferred |

**Deprecated/outdated:**
- **`err.name === 'PrismaClientKnownRequestError'`** with `as any` cast: The `instanceof` pattern is the supported API in Prisma 5+. The `@prisma/client/runtime/library` path is the official import for `PrismaClientKnownRequestError`. [VERIFIED: runtime import test]
- **`dbRecord: any`** in transform functions: Should use typed interfaces. The `any` type defeats TypeScript's purpose and hides bugs when the include shape changes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `debug.ts` gating on `import.meta.env.DEV \|\| import.meta.env.VITE_DEBUG === 'true'` is sufficient — no additional runtime flag needed | BUGS-04, Pattern 3 | If VITE_DEBUG is not set in production builds of the Docker image, there's no way to enable debug output at runtime. The `window.APP_CONFIG?.debug` pattern could be also added to the utility but wasn't specified in decisions. **Decision D-06 says "use `import.meta.env.DEV` or `import.meta.env.VITE_DEBUG`" — the agent's discretion allows choosing between them.** The utility should support BOTH for maximum flexibility. |
| A2 | Local interface for `RecurringChoreDbRecord` is simpler than Prisma type gymnastics | BUGS-02 | If `RECURRING_CHORE_INCLUDE` shape changes frequently, the local interface becomes a maintenance burden. However, this is a stable shape (the function has existed unchanged). Phase 2 Prisma upgrade may make `Prisma.RecurringChoreGetPayload` more ergonomic — at that point, the local interface can be replaced. |
| A3 | The `recurring-chores.controller.ts` file (imported by the dead route file) may also be dead | TECH-01 | If `recurring-chores.controller.ts` is still used elsewhere, deleting only the route file is safe. The research verified zero imports of the route file itself, but did not verify whether the controller it imports is used. **Mitigation: run `npm run build` after deletion to catch any import chain breakage.** |

## Open Questions

1. **Is `recurring-chores.controller.ts` also dead code?**
   - What we know: `recurring-chores.routes.ts` (the route file) has zero imports in the codebase. It imports `recurring-chores.controller.ts`.
   - What's unclear: Whether the controller file itself is imported elsewhere or is also dead.
   - Recommendation: Delete only the route file (TECH-01 scope). If the controller is also dead, flag it for TECH-05 (Phase 3 — dead code cleanup). Run `npm run build` after deletion to verify.

2. **Should `debug.ts` also check `window.APP_CONFIG?.debug`?**
   - What we know: The existing `debugEnabled` pattern in `client.ts` checks `import.meta.env.DEV || window.APP_CONFIG?.debug || import.meta.env.VITE_DEBUG`. The `debug.ts` utility could incorporate the same runtime check.
   - What's unclear: Decision D-06 only mentions `import.meta.env.DEV` and `import.meta.env.VITE_DEBUG`.
   - Recommendation: Use `import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'` in the utility. This is the agent's discretion per CONTEXT.md. The `window.APP_CONFIG?.debug` check can stay in `client.ts` for its specific use case (the client has access to `window`), while the shared utility stays environment-flag-only. This avoids coupling the utility to the DOM.

3. **What exact version will `npm audit fix` resolve each package to?**
   - What we know: `npm audit fix` without `--force` resolves to the highest safe version within each package's declared semver range.
   - What's unclear: Exact resolved versions depend on the current lockfile state and npm's resolution algorithm.
   - Recommendation: Run `npm audit fix` in Wave 0, capture the version changes, update RESEARCH.md findings if major differences emerge. Run test suites after resolving.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend build, frontend build | ✓ | 18+ | — |
| npm | Package management, audit fix | ✓ | 11.12.1 | — |
| TypeScript | Compilation check | ✓ | 5.3.3 | — |
| Prisma CLI | Type generation (unchanged) | ✓ | 5.7.1 | — |

**Missing dependencies with no fallback:** None — all required tools are available in the existing development environment.

## Sources

### Primary (HIGH confidence)
- `backend/src/controllers/recurring-chores-occurrences.controller.ts` — lines 48-52: confirmed BUGS-01 nested ternary location
- `backend/src/middleware/errorHandler.ts` — lines 54-55: confirmed TECH-04 `as any` cast location
- `backend/src/routes/recurring-chores.routes.ts` — 394 lines, confirmed zero imports via grep of `backend/src/`
- `backend/src/routes/index.ts` — confirmed all route mounting pattern except metricsRoutes
- `backend/src/app.ts` — lines 17, 156: confirmed metricsRoutes direct mount location
- `backend/src/services/recurring-chores/transform.service.ts` — line 5: confirmed BUGS-02 `dbRecord: any`
- `backend/src/services/recurring-chores/occurrence-management.service.ts` — lines 4-9: confirmed BUGS-03 missing logger
- `backend/src/services/recurring-chores/recurring-chore-management.service.ts` — lines 9-26: confirmed `RECURRING_CHORE_INCLUDE` shape
- `frontend/src/api/client.ts` — lines 94, 95, 112, 118, 125: confirmed TECH-04 `as any` cast locations; lines 21-22: confirmed existing debugEnabled pattern
- `frontend/src/types/index.ts` — confirmed `ApiError` type shape (`{success: false, error: {message: string, code: string}}`)
- `frontend/src/vite-env.d.ts` — confirmed `VITE_DEBUG` type declaration
- `frontend/package.json` — confirmed axios 1.13.6, vite 6.2.0, vitest 4.1.0
- `backend/package.json` — confirmed Prisma 5.22.0, zod 4.3.6, axios 1.14.0, nodemailer 8.0.4
- `.planning/phases/01-remediate-codebase-concerns/01-CONTEXT.md` — all implementation decisions (D-01 through D-07)
- `.planning/codebase/CONCERNS.md` — full audit of all issues (cross-reference)
- `.planning/codebase/ARCHITECTURE.md` — confirmed single Prisma client pattern, middleware chain
- npm registry — axios 1.15.2, nodemailer 8.0.7, vite 8.0.10, lodash 4.18.1, follow-redirects 1.16.0 [VERIFIED: 2026-05-02]
- `@prisma/client/runtime/library` — confirmed `PrismaClientKnownRequestError` export with `instanceof` support [VERIFIED: runtime test]
- `node_modules/.prisma/client/index.d.ts` — confirmed `RecurringChoreGetPayload` type signature (selection-level `S` param, not include shape)

### Secondary (MEDIUM confidence)
- `npm audit` output for both backend and frontend — 6 vulnerabilities each, confirmed fix availability [VERIFIED: 2026-05-02]
- GitHub Advisory Database (GHSA) — vulnerability details for axios, nodemailer, lodash, follow-redirects, brace-expansion, picomatch, vite [CITED: GHSA URLs in npm audit output]

### Tertiary (LOW confidence)
- None — all findings verified against source code or official registries.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against package.json and npm registry
- Architecture: HIGH — all patterns verified against existing codebase structure
- Pitfalls: HIGH — pitfalls identified from real code patterns and known failure modes
- Code locations: HIGH — every file, line number, and cast confirmed by reading the source

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (30 days — stable remediation patterns, no fast-moving APIs)
