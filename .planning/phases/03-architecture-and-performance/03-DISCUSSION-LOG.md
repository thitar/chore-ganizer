# Phase 3: Architecture & Performance — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 03-architecture-and-performance
**Areas discussed:** PocketMoney extraction scope, Seed password hardening, Penalty parallelization, Prisma migration, Service naming

---

## PocketMoney Extraction Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Single service | All 27 prisma calls in one PocketMoneyService | |
| Four-domain split | Points, payouts, adjustments, balance — max granularity | |
| Three-domain split | Points+adjustments combined, payouts separate, balance separate | ✓ |

**User's choice:** Three-domain split
**Notes:** Follow recurring-chores subdirectory pattern.

---

## Seed Password Hardening

| Option | Description | Selected |
|--------|-------------|----------|
| Force-change on first login | Add passwordChangeRequired field, redirect flow | |
| Auto-generate random passwords | Random per-user at seed, print to logs | |
| Documented warning only | Prominent log message in docker-entrypoint.sh | ✓ |

**User's choice:** Documented warning only
**Notes:** Seed only runs on empty DB with @home.local emails. Low risk.

---

## Penalty Parallelization

| Option | Description | Selected |
|--------|-------------|----------|
| Log + continue | Per-chore error isolation, summary of succeeded/failed | ✓ |
| Fail-fast | Stop on first error | |

**User's choice:** Log + continue with Promise.allSettled()
**Notes:** Batch parent notification settings before loop to fix N+1.

---

## Prisma Migration Approach

| Option | Description | Selected |
|--------|-------------|----------|
| No concerns, proceed | Generate baseline, swap command, verify both paths | ✓ |
| Conservative — test with data copy | Run test with production data copy first | |

**User's choice:** No concerns, proceed

---

## Service Naming Order

| Option | Description | Selected |
|--------|-------------|----------|
| Delete dead notificationService.ts | 214 lines, 0 production imports | ✓ |
| Rename it anyway | Cosmetic consistency | |

**User's choice:** Delete notificationService.ts, rename emailService.ts → email.service.ts

---

## Agent's Discretion

- Exact file structure and naming of pocket-money sub-services
- Whether to extract balance-related controller endpoints to separate route file
- Migration file name for baseline (`init` vs `baseline`)
- Order of operations for parallel penalty loop

## Deferred Ideas

None — discussion stayed within phase scope.
