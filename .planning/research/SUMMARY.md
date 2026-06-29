# Project Research Summary

**Project:** Chore-Ganizer v2.3.0 Production Readiness (Bugfix Milestone)
**Domain:** Family chore management app (Express/Prisma/SQLite + React)
**Researched:** 2026-05-03
**Confidence:** HIGH

## Executive Summary

This milestone targets 7 production-readiness bugs in a homelab family chore management app. The bugs span dual-bookkeeping divergence between `user.points` and `PointTransaction` records (the core architectural debt), a double-penalty bug that can overcharge children for overdue chores, incorrect transaction type semantics, a missing `familyId` propagation on user creation, and a frontend card that's hardcoded to show empty data. All bugs were verified against actual source code — no speculative findings.

**The recommended approach is a 5-phase build order starting with independent additive fixes (USR-01, UI-01), progressing through balance calculation correctness (BAL-01), then the penalty pipeline (PEN-02, PEN-03, PEN-01), and finishing with the largest change: dual-bookkeeping consistency across all 7 point-mutation code paths (INT-01).** The critical architectural pattern is Prisma `$transaction` (interactive callback) for any operation that modifies both `user.points` and `PointTransaction` — this is already used correctly in one place (`completeAssignment`) but missing from five others.

**Key risks:** (1) The sign convention for `PointTransaction.amount` is inconsistent across code paths — some store positive amounts with type indicating negativity, others store negative amounts directly. The PEN-01 fix must pick the right convention to avoid breaking the (already buggy) running balance calculation. (2) INT-01 is significantly larger than documented in CONCERNS.md — 4 pocket-money endpoints already create `PointTransaction` records without updating `user.points`, meaning divergence is not "theoretical" but active. (3) Mock updates are required for unit tests across 3 service files, and TypeScript type definitions must be updated for USR-01.

## Key Findings

### Recommended Stack (from STACK.md)

The project already uses Prisma with SQLite. The research confirms the existing stack is correct but identifies that Prisma `$transaction` (interactive callback form) is underutilized — used in only 1 of 6 point-mutation code paths. All bugs are logic errors, not stack mismatches.

**Core Prisma patterns for this milestone:**
- **Interactive `$transaction(async (tx) => { ... })`**: Required wherever 2+ Prisma writes must be atomic (user.points update + PointTransaction create + optional assignment update). Already proven in `completeAssignment`; must extend to `applyOverduePenalty` and 4 pocket-money endpoints.
- **Atomic `increment` operations**: `{ points: { increment: delta } }` where `delta` is a signed value — already the convention, must be preserved.
- **Denormalized counter pattern**: `user.points` is a cache of `SUM(PointTransaction.amount)`. Every code path that mutates points MUST update BOTH atomically. Currently only 3 of 7 paths update `user.points`, and 6 of 7 create `PointTransaction` — the overlap is just 3 paths.

**No version bumps needed** — `@prisma/client@^5.22.0` and `prisma@^5.7.1` fully support the interactive `$transaction` API.

### Expected Features (from FEATURES.md)

Since this is a bugfix milestone, "features" are **correct behavior specifications** for each bug:

**Critical fixes (affects point accuracy):**
- **PEN-02 (Double Penalty)**: When cron penalty already applied, `completeAssignment` must NOT deduct penalty again. Net change to user points should be `templatePoints - singlePenalty`, not `templatePoints - doublePenalty`.
- **PEN-01 (Missing Penalty Transaction)**: Cron penalty must create a `PointTransaction` record so the child can see why their balance dropped. Must be atomic with the `user.points` decrement.
- **BAL-01 (ADJUSTMENT Inconsistency)**: Balance endpoint and transaction history must agree on the value of ADJUSTMENT transactions — ADJUSTMENT should follow `tx.amount` sign (like EARNED/BONUS), not always be subtracted.

**Important but lower severity:**
- **PEN-03 (Wrong Penalty Type)**: Late completions should use `'PENALTY'` type, not `'DEDUCTION'`, for transaction history clarity.
- **USR-01 (Missing familyId)**: New users created by parents must inherit the parent's `familyId` so they appear in admin dashboard immediately.
- **UI-01 (NotifConfigCard Empty)**: AdminPage's NotifConfigCard must fetch real notification settings instead of hardcoded `data={null}`.

**Foundational (must fix for consistency):**
- **INT-01 (Dual Bookkeeping)**: After all 6 other fixes, 4 pocket-money endpoints (bonus, deduction, advance, payout) still create `PointTransaction` without updating `user.points`. Fixing these completes the consistency guarantee.

### Architecture Approach (from ARCHITECTURE.md)

The 7 bugfixes span 3 architectural layers (backend services, backend controllers, frontend pages) and touch 8 source files across 6 modules. The architecture is a straightforward layered Express + React app — no complex patterns to navigate.

**Major affected components:**
1. **Backend Services** (`chore-assignments.service.ts`, `overdue-penalty.service.ts`, `users.service.ts`) — Business logic for chore completion, penalty application, and user creation. PEN-01, PEN-02, PEN-03, USR-01 live here.
2. **Backend Controllers** (`pocket-money.controller.ts`, `users.controller.ts`) — HTTP request handlers for pocket money operations and user CRUD. BAL-01, INT-01, USR-01 live here.
3. **Frontend Components** (`AdminPage.tsx`, `NotifConfigCard.tsx`) — React pages and cards. UI-01 lives here.
4. **Auth Middleware** (`auth.ts`) — User authentication and session management with Prisma select for user fields. USR-01 requires adding `familyId` to the select.
5. **Type Definitions** (`express.d.ts`) — TypeScript interface for `req.user`. Must be updated for USR-01.

**Key patterns:**
- Point balance source of truth: `SUM(PointTransaction.amount)`, NOT `user.points` (which is a denormalized cache)
- No architectural changes needed — all fixes are additive or one-line modifications to existing functions

### Critical Pitfalls (from PITFALLS.md)

1. **Sign convention inconsistency across PointTransaction amounts** — Different code paths store amounts differently (some positive, some negative). The running balance calculation is already buggy for DEDUCTION/ADVANCE/PAYOUT transactions due to this. **Prevention:** Store penalties as positive amounts with `'PENALTY'` type (matching the completion handler's convention), not negative amounts (matching the controller's broken convention). This avoids making the running balance MORE wrong.

2. **PEN-02 is NOT just a one-line guard change** — Adding `!assignment.penaltyApplied` to only the points deduction condition is insufficient. If `penaltySettings` isn't nulled out early, the transaction type (line 378), description (lines 384-386), and `penaltyApplied`/`penaltyPoints` update (lines 392-399) all still fire. **Prevention:** Null out `penaltySettings` when both `isOverdue && assignment.penaltyApplied` are true, collapsing all downstream conditions naturally.

3. **INT-01 is twice as large as documented in CONCERNS.md** — CONCERNS.md #7 describes "theoretical" divergence risk. In reality, 4 endpoints already diverge: `addBonus`, `addDeduction`, `addAdvance`, and `createPayout` all create `PointTransaction` records without updating `user.points`. The fix requires wrapping each of 4 endpoints in `$transaction`, adding `user.update` to each — plus potential one-time reconciliation of pre-existing diverged data.

4. **Unit test mocks will break for at least 3 test files** — PEN-01 requires adding `pointTransaction.create` to the overdue-penalty mock. PEN-02 requires a new test case for `penaltyApplied=true`. USR-01 requires updating `createUser` mock assertions in users.service.test.ts. These must be identified and updated BEFORE running tests, not after.

5. **BAL-01 has a second hidden location** — `calculateProjectedEarnings()` (line 790) has the same ADJUSTMENT sign bug as `calculatePointBalance()`. Fixing only one location leaves an inconsistent user experience (projected earnings page shows different values than balance page).

## Implications for Roadmap

Based on combined research, the suggested build order is:

### Phase 1: Independent Additive Fixes (Parallelizable)
**Rationale:** USR-01 and UI-01 touch completely different files from each other and from all other fixes. USR-01 is purely additive (no existing behavior changes), and UI-01 is frontend-only with a working backend endpoint.
**Delivers:** New users get familyId (appear in dashboard immediately) + NotifConfigCard shows real notification settings
**Addresses:** USR-01, UI-01
**Avoids:** Pitfalls 5.1 (type definition update required — add `familyId` to `express.d.ts`), 5.3 (unit test assertions break — update mock expectations), 6.1 (use auth context to get current user ID)
**Research flag:** **Standard patterns** — both fixes are straightforward additive changes. No deeper research needed.

### Phase 2: Balance Calculation Correctness
**Rationale:** BAL-01 must precede INT-01 to avoid cascading test failures — the INT-01 fixes change `user.points` values that balance calculations depend on. Fixing BAL-01 first ensures balance checks in `addDeduction`, `addAdvance`, and `createPayout` use correct values.
**Delivers:** ADJUSTMENT transactions are correctly counted in both `calculatePointBalance()` and `calculateProjectedEarnings()`
**Addresses:** BAL-01
**Avoids:** Pitfall 4.1 (fix BOTH locations: line 111 AND line 790), 4.2 (move ADJUSTMENT to positive case, don't delete it), 4.3 (don't touch running balance code — it already handles ADJUSTMENT correctly)
**Research flag:** **Standard patterns** — well-understood switch statement fix. No deeper research needed.

### Phase 3: Penalty Pipeline
**Rationale:** Grouping all 3 penalty fixes in one phase ensures they're tested together. PEN-02 (guard against double-penalty) must precede or be simultaneous with PEN-03 (type change) because PEN-02 changes the control flow that determines whether the PEN-03 string is reached. PEN-01 (cron transaction logging) is the foundation that makes PEN-02's guard meaningful.
**Sub-order:** PEN-02 guard → PEN-03 type string → PEN-01 cron transaction creation
**Delivers:** No double-penalty, correct transaction type (`'PENALTY'` not `'DEDUCTION'`), atomic penalty logging with PointTransaction
**Addresses:** PEN-02, PEN-03, PEN-01
**Avoids:** Pitfall 2.1 (null out `penaltySettings` early, don't just guard one condition), 1.1 (wrap all 3 writes in `$transaction`), 1.2 (careful sign convention — store positive amount with type 'PENALTY'), 1.3 (update mock before running tests), 3.1 (check frontend rendering for 'PENALTY' type label)
**Research flag:** **Standard patterns** — all well-documented Prisma patterns. PEN-01's sign convention requires awareness but is a one-time decision.

### Phase 4: Dual Bookkeeping Consistency
**Rationale:** Largest change (4 endpoints in pocket-money.controller.ts, each needing `$transaction` + `user.update`). Doing this last means all other point-mutation paths are already correct, so only these 4 remain. Must be done after BAL-01 (balance checks use correct values) and after PEN-01 (cron path is already consistent).
**Delivers:** All 7 point-mutation paths atomically update both `user.points` and `PointTransaction`
**Addresses:** INT-01
**Avoids:** Pitfall 7.1 (wrap in `$transaction`), 7.2 (use shared sign variable — don't repeat sign logic), 7.3 (createPayout has 3 atomic writes to manage), 7.6 (run one-time reconciliation SQL for pre-existing diverged data)
**Research flag:** **Needs deeper planning** — the reconciliation SQL for pre-existing diverged data needs to be reviewed for correctness. The `createTransaction` helper function may need refactoring to accept a `tx` parameter for transaction participation.

### Phase 5: Verification and Reconciliation
**Rationale:** After all fixes are applied, a final phase to run the one-time reconciliation query, verify consistency across all paths, and update tests/assertions.
**Delivers:** Verified consistent state, one-time data migration SQL, updated integration tests
**Avoids:** Pitfall 7.6 (pre-existing divergence persists after fix)
**Research flag:** **Needs validation** — the reconciliation query should be reviewed against actual schema. The formula in Pitfall 7.6 handles sign conventions but should be verified with real data.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Prisma patterns verified against actual source code and Prisma docs. No version bumps needed. |
| Features | HIGH | All 7 bug behaviors verified against source code. Acceptance criteria derived from code, not speculation. |
| Architecture | HIGH | File-level placement verified against 12 source files. No architectural changes needed — only additive/modified fixes. |
| Pitfalls | HIGH | All pitfalls verified against actual code paths. Sign convention inconsistency confirmed through line-by-line analysis of running balance, calculatePointBalance, and all 7 mutation paths. |

**Overall confidence:** HIGH

### Gaps to Address

- **INT-01 reconciliation SQL format**: The one-time reconciliation SQL in Pitfall 7.6 handles sign conventions for existing data. This needs to be reviewed against the Prisma schema and actual data before running. The SQL should handle `ADJUSTMENT` correctly (after BAL-01 fix, ADJUSTMENT follows sign like EARNED). **Recommendation:** Generate the SQL during Phase 4 and review it against a snapshot of production data.
- **`createTransaction` helper refactoring**: The `createTransaction` helper function (pocket-money.controller.ts line 69) currently creates PointTransactions without participating in a `$transaction`. For INT-01, this helper must either accept a `tx` parameter or all 4 callers must inline the create. **Decision needed in Phase 4 planning:** inline vs. refactor helper.
- **PEN-02 race condition**: A theoretical race between cron and completion handler reading stale `penaltyApplied` data. Practically zero-risk for single-user SQLite homelab, but worth documenting as a known limitation.
- **UI-01 empty state**: After fix, `getOrCreateSettings` always returns data (never 404), so the `NotifConfigCard`'s "No notification config" empty state becomes dead code. Defer removal — it's harmless and defensive.

## Sources

### Primary (HIGH confidence)
- **Source code analysis** — 12 files directly read and verified:
  - `backend/src/services/chore-assignments.service.ts` (lines 262-406)
  - `backend/src/services/overdue-penalty.service.ts` (lines 73-119)
  - `backend/src/controllers/pocket-money.controller.ts` (lines 95-127, 396-448, 473-732)
  - `backend/src/middleware/auth.ts` (lines 33-43)
  - `backend/src/services/users.service.ts` (lines 100-131)
  - `backend/src/types/express.d.ts` (lines 1-18)
  - `backend/src/controllers/users.controller.ts` (lines 41-78)
  - `backend/src/controllers/admin.controller.ts` (lines 43-56)
  - `backend/src/services/admin.service.ts` (lines 173-207)
  - `frontend/src/pages/AdminPage.tsx` (lines 1-20)
  - `frontend/src/components/admin/NotifConfigCard.tsx` (lines 1-104)
  - `backend/prisma/schema.prisma` — data model
- **CONCERNS.md** — bug descriptions (verified/expanded against source code)
- **PROJECT.md** — milestone scope definitions
- **Prisma docs** (via Context7 `/prisma/prisma`) — Transactions API, interactive callbacks, atomic number operations

### Secondary (MEDIUM confidence)
- **Existing unit tests** — `backend/src/__tests__/services/overdue-penalty.service.test.ts`, `chore-assignments.service.test.ts`, `users.service.test.ts` — mock surfaces inferred from code pattern analysis
- **Integration tests** — `pocket-money.integration.test.ts`, `users.integration.test.ts` — used to determine test gap analysis
- **E2E tests** — `e2e/admin.spec.ts`, `e2e/pocket-money.spec.ts`, `e2e/p311-overdue-penalty.spec.ts` — coverage gap analysis

---
*Research completed: 2026-05-03*
*Ready for roadmap: yes*
