# Stack Research — Prisma Patterns for Bugfix Milestone

**Domain:** Express/Prisma/SQLite + React point-accounting app
**Researched:** 2026-05-03
**Confidence:** HIGH

## Core Finding

Prisma `$transaction` (interactive callback form) is already correctly used in one code path (`completeAssignment` in chore-assignments.service.ts) but **missing** from three other code paths that modify points. Two additional code paths update `user.points` but never create a `PointTransaction` record (diverging the dual bookkeeping). The fixes must bring all point-mutating operations into transactional consistency.

---

## Prisma Pattern 1: Interactive `$transaction` for Multi-Model Writes

**Already used in:** `chore-assignments.service.ts:331` — `completeAssignment()`

**The correct pattern:**

```typescript
const result = await prisma.$transaction(async (tx) => {
  // tx is a Prisma transaction client — use it for ALL DB ops in this tx
  const updated = await tx.choreAssignment.update({
    where: { id: assignmentId },
    data: { status, completedAt: new Date() },
  })

  await tx.user.update({
    where: { id: assignment.userId },
    data: { points: { increment: pointsToAward } },
  })

  await tx.pointTransaction.create({
    data: {
      userId: assignment.userId,
      type: transactionType,
      amount: pointsToAward,
      description: `Completed: ${assignment.choreTemplate.title}`,
      choreAssignmentId: assignmentId,
    },
  })

  return updated
})
```

**Key rules:**
1. Use the `tx` parameter for ALL operations inside the callback — never `prisma.user.update(...)` (that bypasses the transaction)
2. Return the value you need from the callback — it becomes the resolution value
3. Any thrown error aborts the entire transaction (SQLite rolls back)
4. Timeout defaults to 5 seconds; can override: `$transaction(async (tx) => { ... }, { timeout: 10000 })`
5. Isolation level defaults to SQLite's serializable (the only level SQLite supports), so no `isolationLevel` parameter needed

**Why interactive callback over array form:**
`$transaction([prisma.x.update(...), prisma.y.create(...)])` works for unconditional writes, but the array form does not allow reading data first and making conditional decisions. The interactive callback is required here because:
- `completeAssignment` reads the assignment first to check status, penaltyApplied, etc.
- `applyOverduePenalty` reads the assignment to get template points
- Transaction type depends on conditional checks

**Documentation:** Context7 /prisma/prisma — "Prisma Transactions" / "Transactions API"

---

## Prisma Pattern 2: Atomic Number Operations (`increment`)

**Already used in:** `chore-assignments.service.ts:371`, `overdue-penalty.service.ts:100`

Prisma supports atomic number operations without read-modify-write:

```typescript
// Correct: atomic increment/decrement
await tx.user.update({
  where: { id: userId },
  data: { points: { increment: delta } },  // delta can be negative
})
```

**Critical detail for penalties:**
- Penalty points are **negative** (e.g., `-20` for a 10-point chore × 2 multiplier)
- `{ increment: -20 }` correctly decrements `user.points` atomically
- Do NOT use `{ decrement: 20 }` — mixing `increment` and `decrement` reduces consistency
- Always use `increment` with the signed value; this is already the convention

**Documentation:** Context7 /prisma/prisma — "Update Records with Prisma" / "Atomic number operations"

---

## Prisma Pattern 3: Denormalized Counter (`user.points` vs `PointTransaction`)

### Current State (broken)

The app has two sources of truth:
- `user.points` — an integer field on the User model
- Sum of `PointTransaction.amount` — the normalized ledger

**Three classes of behavior exist today:**

| Code Path | Updates `user.points` | Creates `PointTransaction` | Uses `$transaction` | Consistent? |
|-----------|----------------------|---------------------------|---------------------|-------------|
| `completeAssignment` (chores) | ✅ | ✅ | ✅ | ✅ |
| `applyOverduePenalty` (cron) | ✅ | ❌ (PEN-01 bug) | ❌ | ❌ |
| `addBonus`, `addDeduction`, `addAdvance`, `createPayout` (pocket-money controller) | ❌ | ✅ | ❌ | ❌ |

### Recommended Pattern — Source of Truth: `PointTransaction`

**Rule:** `user.points` is a **cache** of `SUM(PointTransaction.amount)` computed purely from `PointTransaction` records. Every code path that modifies points must:

1. Create a `PointTransaction` record (the ledger entry)
2. Update `user.points` with the corresponding delta (the cache)
3. Both inside the same `$transaction`

```typescript
// The canonical pattern for ANY point modification:
await prisma.$transaction(async (tx) => {
  // 1. Create the ledger entry first
  await tx.pointTransaction.create({
    data: {
      userId,
      type: 'BONUS', // or DEDUCTION, PENALTY, PAYOUT, ADVANCE, ADJUSTMENT
      amount,         // positive for credits, negative for debits
      description,
      relatedUserId: parentUserId,
    },
  })

  // 2. Update the cache
  await tx.user.update({
    where: { id: userId },
    data: { points: { increment: amount } }, // amount is signed
  })
})
```

### How `calculatePointBalance` Should Work

The balance endpoint at `pocket-money.controller.ts:95` currently sums `PointTransaction` records manually in a loop with a **buggy** switch statement (BAL-01). The correct approach:

**Option A (recommended for this milestone — minimal change):**
Fix the switch to handle `ADJUSTMENT` by sign, not by hardcoded negativity:
```typescript
// Lines 102-114: Fix ADJUSTMENT handling
switch (tx.type) {
  case 'EARNED':
  case 'BONUS':
  case 'ADJUSTMENT':   // ← ADD: ADJUSTMENT follows amount sign
    totalPoints += tx.amount
    break
  case 'DEDUCTION':
  case 'PENALTY':
  case 'PAYOUT':
  case 'ADVANCE':
    totalPoints -= Math.abs(tx.amount)
    break
}
```

**Option B (future optimization — do NOT do now):**
Replace the manual loop with `prisma.pointTransaction.aggregate({ _sum: { amount: true } })`. This would be more efficient but changes the interface — requires verifying all consumers. Defer this optimization.

### Dual Bookkeeping (INT-01) — What to Fix

CONCERNS.md rates INT-01 as "low priority," but the **four pocket-money controller paths that create PointTransactions without updating `user.points`** are latent bugs. If any code path ever reads `user.points` directly (e.g., dashboard summary, sorting, display), it will show the wrong value.

**Pragmatic recommendation for this milestone:** Fix the four pocket-money controller operations to also update `user.points` inside a `$transaction`, since they modify the same data. This is a small change (wrap each `createTransaction` call + add a `user.update`). It closes the gap without adding significant scope.

---

## Pattern Application Per Bug

| Bug | File | Current Pattern | Fix Pattern |
|-----|------|----------------|-------------|
| **PEN-01** | `overdue-penalty.service.ts:73` | Two sequential `await` calls (no transaction), no `PointTransaction` | Wrap `user.update` + `choreAssignment.update` + `pointTransaction.create` in `$transaction` |
| **PEN-02** | `chore-assignments.service.ts:262` | Checks `isOverdue` but not `penaltyApplied` | Add `penaltyApplied` to the `findUnique` select; skip penalty deduction if `assignment.penaltyApplied === true` — already inside `$transaction` |
| **PEN-03** | `chore-assignments.service.ts:378` | `'DEDUCTION'` string literal | Change to `'PENALTY'` — no transaction change needed |
| **BAL-01** | `pocket-money.controller.ts:95` | `ADJUSTMENT` in negative case | Remove `ADJUSTMENT` from negative group; let it fall to default (follow `tx.amount` sign) |
| **USR-01** | `auth.ts:35`, `users.service.ts:100`, `users.controller.ts` | `familyId` not selected or passed | Add `familyId` to auth middleware select; thread through controller to service `create` data |
| **UI-01** | `AdminPage.tsx:16` | Frontend only — hardcoded `data={null}` | Wire up actual API call — no Prisma change |
| **INT-01** | `pocket-money.controller.ts:473-732` | Four endpoints create `PointTransaction` but don't update `user.points` | Wrap each in `$transaction` adding `user.update({ points: { increment: amount } })` |

---

## Specific Code Examples for Each Fix

### Fix 1 (PEN-01): `applyOverduePenalty` — Add $transaction + PointTransaction

```typescript
// Current (lines 95-112):
await prisma.user.update({
  where: { id: assignment.userId },
  data: { points: { increment: penaltyPoints } },
})
await prisma.choreAssignment.update({
  where: { id: assignmentId },
  data: { penaltyApplied: true, penaltyPoints },
})
// ❌ No PointTransaction, no $transaction

// Fixed:
const result = await prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: assignment.userId },
    data: { points: { increment: penaltyPoints } },
  })

  await tx.choreAssignment.update({
    where: { id: assignmentId },
    data: { penaltyApplied: true, penaltyPoints },
  })

  await tx.pointTransaction.create({
    data: {
      userId: assignment.userId,
      type: 'PENALTY',
      amount: penaltyPoints,  // negative integer
      description: `Overdue penalty: ${assignment.choreTemplate.title}`,
      choreAssignmentId: assignmentId,
    },
  })
})

return {
  penaltyPoints,
  userId: assignment.userId,
  choreTitle: assignment.choreTemplate.title,
}
```

### Fix 2 (PEN-02): Check `penaltyApplied` in `completeAssignment`

Change the initial `findUnique` on line 272 to include `penaltyApplied`:
```typescript
const assignment = await prisma.choreAssignment.findUnique({
  where: { id: assignmentId },
  include: {
    choreTemplate: true,
    // penaltyApplied is on ChoreAssignment directly, not a relation
  },
  select: {
    // If the rest of the function uses the full object, just add penaltyApplied
    // via include. But since we use assignment.penaltyApplied, we need it selected.
  },
})
```

Actually, looking at the code: the `findUnique` uses `include: { choreTemplate: true }` which returns all fields of `ChoreAssignment` including `penaltyApplied`. Let me verify...

The ChoreAssignment model has `penaltyApplied Boolean @default(false)` — this is a direct field, not a relation. When using `include` on relations, the base model's fields are automatically included. So `penaltyApplied` IS already returned. The fix just needs the conditional check at line 301:

```typescript
if (isOverdue && !assignment.penaltyApplied && penaltySettings?.overduePenaltyEnabled) {
  pointsToDeduct = Math.abs(assignment.choreTemplate.points * penaltySettings.overduePenaltyMultiplier)
}
```

Then at line 326:
```typescript
if (isOverdue && !assignment.penaltyApplied && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0) {
  pointsToAward = Math.max(0, pointsToAward - pointsToDeduct)
}
```

And at line 392:
```typescript
if (isOverdue && !assignment.penaltyApplied && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0) {
```

The key insight: the `findUnique` on line 272 uses `include: { choreTemplate: true }`, which selects ALL fields of `ChoreAssignment` — including `penaltyApplied`. So no select change needed. Just add the `!assignment.penaltyApplied` guard.

### Fix 5 (PEN-03): String change

Line 378: `'DEDUCTION'` → `'PENALTY'`

### Fix 4 (BAL-01): Fix calculation

Line 111: Remove `'ADJUSTMENT'` from the `DEDUCTION/PENALTY/PAYOUT/ADVANCE` case. It should default to following `tx.amount` sign like `EARNED`/`BONUS`.

### Fix 6 (USR-01): Add familyId propagation

In `auth.ts`, add `familyId: true` to the `select` (line ~41). Then in the `req.user` attachment (line ~59), include it. Then in `users.controller.ts`, pass `req.user.familyId` to `createUser`. In `users.service.ts`, accept and use it.

### Fix 7 (INT-01): Wrap pocket-money operations in $transaction

For `addBonus` (line 473), `addDeduction` (line 517), `addAdvance` (line 567), `createPayout` (line 668):

```typescript
// Current (addBonus example):
const transaction = await createTransaction(targetUserId, 'BONUS', amount, { ... })
// Missing: user.points update

// Fixed:
await prisma.$transaction(async (tx) => {
  await tx.pointTransaction.create({
    data: {
      userId: targetUserId,
      type: 'BONUS',
      amount,
      description: description || 'Bonus points awarded',
      relatedUserId: parentUserId,
    },
  })
  await tx.user.update({
    where: { id: targetUserId },
    data: { points: { increment: amount } },
  })
})
```

Note: `createTransaction` is a helper function on line 69 of pocket-money.controller.ts. For INT-01, refactor the helper to accept a `tx` parameter so it can participate in the transaction, or inline the create calls.

---

## Prisma Version Notes

| Detail | Value |
|--------|-------|
| `@prisma/client` | `^5.22.0` |
| `prisma` (CLI) | `^5.7.1` |
| Database | SQLite (via `provider = "sqlite"`) |
| $transaction API | Available since Prisma 2.x — stable in 5.x |
| SQLite `$transaction` notes | SQLite locks the entire database during write transactions; concurrency is inherently serialized. The interactive callback form works identically to PostgreSQL/MySQL. No `isolationLevel` parameter needed — SQLite only supports serializable. |

**Version compatibility:** The `$transaction(async (tx) => { ... })` API is supported in `@prisma/client@5.22.0`. No version bump needed.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `prisma.$transaction([...])` array form | Cannot conditionally read records before writing; all operations must be known upfront | `prisma.$transaction(async (tx) => { ... })` interactive callback form |
| Reading `user.points` for balance display | Stale — many code paths don't update it | Sum `PointTransaction` records via `aggregate({ _sum: { amount: true } })` |
| Manual loops for balance calculation (`calculatePointBalance`) | Bug-prone (current bug: ADJUSTMENT sign), N+1 on transaction count | `prisma.pointTransaction.aggregate({ _sum: { amount: true }, where: { userId } })` |

---

## Stack Patterns by Variant

**If adding a NEW time-based calculation over transactions:**
- Use `prisma.pointTransaction.aggregate({ _sum: { amount: true }, where: { userId, createdAt: { gte: date } } })`
- Avoid loading all records into JS memory and summing in a loop

**If adding a NEW point-modifying operation:**
- Always use the `$transaction` interactive callback
- Always create a `PointTransaction` AND update `user.points` inside the callback
- Never do one without the other

---

## Sources

- Context7 `/prisma/prisma` — "Prisma Transactions", "Transactions API", "Update Records with Prisma"
- `backend/prisma/schema.prisma` — Current data model (lines 13-50 for User, 197-215 for PointTransaction)
- `backend/src/services/chore-assignments.service.ts:262-406` — Correct $transaction reference implementation
- `backend/src/services/overdue-penalty.service.ts:73-119` — Code path needing $transaction fix (PEN-01)
- `backend/src/controllers/pocket-money.controller.ts:69-89,95-127,473-732` — Code paths needing INT-01 fixes
- CONCERNS.md items 1-7 — Bug definitions and fix approaches
