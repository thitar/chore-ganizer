---
phase: 01-remediate-codebase-concerns
plan: 04
subsystem: frontend-debugging
tags: [console-gating, debug-utility, tree-shaking, vite, information-disclosure]
requires: []
provides: [debug.ts]
affects: [frontend/src/api/client.ts, frontend/src/hooks/useAuth.tsx, frontend/src/main.tsx, frontend/src/pages/*.tsx, frontend/src/components/**/*.tsx]
tech-stack:
  added: []
  patterns: [shared-debug-utility, compile-time-gating, tree-shaking]
key-files:
  created:
    - frontend/src/utils/debug.ts
  modified:
    - frontend/src/api/client.ts
    - frontend/src/main.tsx
    - frontend/src/hooks/useAuth.tsx
    - frontend/src/pages/RecurringChoresPage.tsx
    - frontend/src/pages/Calendar.tsx
    - frontend/src/pages/Dashboard.tsx
    - frontend/src/pages/Chores.tsx
    - frontend/src/pages/Login.tsx
    - frontend/src/pages/PocketMoney.tsx
    - frontend/src/pages/StatisticsPage.tsx
    - frontend/src/components/common/ErrorBoundary.tsx
    - frontend/src/components/layout/Navbar.tsx
    - frontend/src/components/recurring-chores/RecurringChoreFormModal.tsx
    - frontend/src/components/pocket-money/PocketMoneyDashboard.tsx
decisions:
  - "Debug utility gates on both import.meta.env.DEV and VITE_DEBUG env var per D-06"
  - "Simple exported functions (not factory/tagged logger) per D-07"
  - "Existing debugEnabled variables removed from client.ts and useAuth.tsx — gating centralized in debug.ts"
metrics:
  duration: 555s
  completed-date: 2026-05-02
---

# Phase 1 Plan 4: Gate Console Output Summary

**One-liner:** Eliminated all 57 unconditional console.log/error/warn calls from 14 frontend source files by creating a shared `debug.ts` utility that gates on `import.meta.env.DEV` — production builds strip all debug output via Vite tree-shaking.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create shared debug.ts utility | `c56f114` | `frontend/src/utils/debug.ts` |
| 2 | Replace all 57 console calls with debug* aliases | `a38ef09` | 14 frontend source files |

## What Changed

### New File
- **`frontend/src/utils/debug.ts`** — Shared debug utility exporting `debugLog()`, `debugError()`, `debugWarn()`. Each function gates on `import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'`, making them compile-time zero-cost in production (tree-shaken by Vite).

### Modified Files (14 total, 57 replacements)
| File | console.log | console.error | console.warn | Total |
|------|-------------|---------------|--------------|-------|
| `client.ts` | 12 | 3 | 1 | 16 |
| `main.tsx` | 3 | 1 | 0 | 4 |
| `useAuth.tsx` | 11 | 4 | 0 | 15 |
| `RecurringChoresPage.tsx` | 0 | 8 | 0 | 8 |
| `Calendar.tsx` | 0 | 2 | 0 | 2 |
| `Dashboard.tsx` | 0 | 1 | 1 | 2 |
| `Chores.tsx` | 0 | 1 | 0 | 1 |
| `Login.tsx` | 0 | 1 | 0 | 1 |
| `PocketMoney.tsx` | 0 | 1 | 0 | 1 |
| `StatisticsPage.tsx` | 0 | 1 | 1 | 2 |
| `ErrorBoundary.tsx` | 0 | 1 | 0 | 1 |
| `Navbar.tsx` | 0 | 1 | 0 | 1 |
| `RecurringChoreFormModal.tsx` | 0 | 1 | 0 | 1 |
| `PocketMoneyDashboard.tsx` | 0 | 3 | 0 | 3 |

### Removed Patterns
- `client.ts`: Removed local `isDev` and `debugEnabled` variables (lines 25-27) — replaced by `debug.ts` gate
- `useAuth.tsx`: Removed local `isDev` and `debugEnabled` variables (lines 6-8) — replaced by `debug.ts` gate

## Verification Results

- **Zero unconditional console calls:** `grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v "utils/debug.ts"` returns 0 matches
- **Build:** `npm run build` exits 0 (production bundle created successfully)
- **Tests:** 18 test files, 195 tests — all passing
- **Zero debugEnabled references:** No `debugEnabled` variable remains in any source file

## Deviations from Plan

None — plan executed exactly as written. All 57 console calls replaced with gated debug* aliases, all arguments and tag prefixes preserved verbatim.

## Self-Check: PASSED

- `frontend/src/utils/debug.ts` exists and exports all three functions
- Commits `c56f114` and `a38ef09` verified via `git log --oneline -2`
- Zero console calls in frontend source (excluding debug.ts)
- Build and tests pass
