---
phase: 01-remediate-codebase-concerns
plan: 02
subsystem: type-safety
tags: [refactor, type-safety, tech-debt]
requires:
  - 01-01
provides:
  - "Typed Axios error interceptor with CsrfRetryConfig"
  - "Type-safe Prisma error handling via instanceof guard"
affects:
  - "frontend/src/api/client.ts"
  - "backend/src/middleware/errorHandler.ts"
tech-stack:
  added: []
  patterns:
    - "Local shadow types extending Axios InternalAxiosRequestConfig"
    - "instanceof type guards for Prisma error discrimination"
key-files:
  created: []
  modified:
    - "frontend/src/api/client.ts"
    - "backend/src/middleware/errorHandler.ts"
decisions:
  - "D-01: Local shadow types (CsrfRetryConfig) for client.ts — no global declaration merging"
  - "D-02: instanceof PrismaClientKnownRequestError guard for errorHandler.ts"
metrics:
  duration: "3m 53s"
  completed: "2026-05-02T01:29:24Z"
---

# Phase 01 Plan 02: Eliminate `as any` Casts — Summary

**One-liner:** Replaced all 6 `as any` casts in production code with typed alternatives — CsrfRetryConfig local shadow type in client.ts and instanceof PrismaClientKnownRequestError guard in errorHandler.ts.

## Execution Summary

Plan 01-02 eliminated every `as any` cast in the two production files identified by TECH-04. No behavior changed — all verification confirms identical runtime behavior before and after.

### Task 1: CsrfRetryConfig shadow type in client.ts

Replaced 5 `as any` casts in `frontend/src/api/client.ts`:

1. **Lines 94-95 (errorCode/errorMessage):** Removed `as any` — `error.response?.data` is already `ApiError | undefined` via `AxiosError<ApiError>` generic. Direct property access: `error.response?.data?.error?.code`.
2. **Line 112 (errorData):** Removed `as any` — `error.response.data` already typed as `ApiError`.
3. **Lines 118, 125 (_csrfRetryCount):** Replaced `(originalRequest as any)` with typed `originalRequest: CsrfRetryConfig | undefined` using the new local shadow interface.

**Added:** `interface CsrfRetryConfig extends InternalAxiosRequestConfig { _csrfRetryCount?: number }` at the top of the file — scoped locally, no global declaration merging.

**Verification:** `grep -c "as any"` returns 0, TypeScript compiles clean, all 9 client tests pass.

### Task 2: instanceof PrismaClientKnownRequestError guard in errorHandler.ts

Replaced 1 `as any` cast in `backend/src/middleware/errorHandler.ts`:

- **Before:** `if (err.name === 'PrismaClientKnownRequestError') { const prismaError = err as any; if (prismaError.code === 'P2002') ... }`
- **After:** `if (err instanceof PrismaClientKnownRequestError) { if (err.code === 'P2002') ... }`

**Added:** `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'` — already a dependency, no new packages needed.

**Verification:** `grep -c "as any"` returns 0, TypeScript compiles clean, all 241 backend tests pass.

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "as any" frontend/src/api/client.ts` | 0 (PASS) |
| `grep -c "as any" backend/src/middleware/errorHandler.ts` | 0 (PASS) |
| Frontend TypeScript build | PASS (no errors) |
| Backend TypeScript build (errorHandler.ts only) | PASS (no errors) |
| `cd frontend && npx vitest run src/api/client.test.ts` | 9/9 PASS |
| `cd backend && npm test` | 241/242 PASS (1 skipped) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a refactoring-only plan. No new stubs introduced.

## Threat Flags

None — all changes are type-level refactoring. The threat model's T-02-01 and T-02-02 mitigations are correctly implemented: CsrfRetryConfig is file-scoped (no type leakage), and instanceof PrismaClientKnownRequestError uses the single Prisma client instance (no prototype-chain mismatch risk per RESEARCH.md Pitfall 3).

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `785cb93` | refactor(01-02): replace as any casts with CsrfRetryConfig shadow type in client.ts |
| 2 | `a7696c6` | refactor(01-02): replace as any with instanceof PrismaClientKnownRequestError guard in errorHandler.ts |

## Self-Check: PASSED

- `01-02-SUMMARY.md` exists ✓
- Commit `785cb93` exists ✓
- Commit `a7696c6` exists ✓
