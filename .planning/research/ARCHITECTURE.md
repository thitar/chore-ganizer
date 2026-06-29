# Architecture Analysis — Bugfix Milestone (v2.3.0)

**Domain:** Family chore management app (Express + Prisma/SQLite + React)
**Researched:** 2026-05-03
**Mode:** Architecture placement for 7 bugfixes
**Overall confidence:** HIGH — all findings verified against source code

## Executive Summary

The 7 bugfixes span 3 architectural layers (backend services, backend controllers, frontend pages) and touch 6 source files across 5 modules. The most impactful finding is **INT-01 is significantly larger than documented**: 4 pocket-money endpoints create `PointTransaction` records but **never update `user.points`**, meaning dual-bookkeeping divergence is not theoretical — it already exists.

### Layer Map

```
Frontend (React/Vite)
  └─ pages/AdminPage.tsx             ← UI-01 (wire NotifConfigCard)
Backend Controllers (Express route handlers)
  └─ controllers/pocket-money.controller.ts   ← BAL-01, INT-01 (4 endpoints missing user.points update)
  └─ controllers/users.controller.ts          ← USR-01 (pass familyId)
Backend Services (business logic)
  └─ services/overdue-penalty.service.ts      ← PEN-01 (add PointTransaction.create)
  └─ services/chore-assignments.service.ts    ← PEN-02, PEN-03 (guard + rename type)
  └─ services/users.service.ts                ← USR-01 (accept familyId)
Backend Middleware (request pipeline)
  └─ middleware/auth.ts                       ← USR-01 (select familyId)
Type Definitions
  └─ types/express.d.ts                       ← USR-01 (add familyId to req.user)
```

### Point Mutation Code Paths (for INT-01)

| Code Path | File | Updates `user.points`? | Creates `PointTransaction`? |
|---|---|---|---|
| Chore completion | `chore-assignments.service.ts:367` | ✅ YES | ✅ YES |
| Cron penalty | `overdue-penalty.service.ts:96` | ✅ YES | ❌ NO (PEN-01 fixes) |
| Inline penalty (late complete) | `chore-assignments.service.ts:367` | ✅ YES | ✅ YES |
| **addBonus** | `pocket-money.controller.ts:473` | **❌ NO** | ✅ YES |
| **addDeduction** | `pocket-money.controller.ts:517` | **❌ NO** | ✅ YES |
| **addAdvance** | `pocket-money.controller.ts:567` | **❌ NO** | ✅ YES |
| **createPayout** | `pocket-money.controller.ts:668` | **❌ NO** | ✅ YES |

**Conclusion:** `user.points` is only updated by 3 of 7 mutation paths. The `calculatePointBalance()` function (reads from `PointTransaction` table) is the true source of truth, but pages that read `user.points` directly (admin dashboard `getPointSummary` line 202) will show diverged values.

---

## Bugfix Placement Details

### PEN-01: Create PointTransaction in cron penalty path

| Field | Value |
|---|---|
| **File** | `backend/src/services/overdue-penalty.service.ts` |
| **Function** | `applyOverduePenalty()` — lines 73–119 |
| **Bug** | Lines 96–112: decrements `user.points` and sets `penaltyApplied=true` but never creates a `PointTransaction` |
| **Fix type** | **Modified** (add block to existing function) |
| **Approach** | Add `prisma.pointTransaction.create()` call after the two update operations. Wrap all 3 operations in a `prisma.$transaction()` for atomicity (user update + assignment update + transaction create — if one fails, all roll back). |
| **Fix location** | Lines 95–112. Insert after line 112 (after assignment update, before return). |
| **Target line** | Insert at line 113 (before return statement) |
| **Details** | Type: `'PENALTY'`, Amount: `penaltyPoints` (already negative), Description: include chore title, choreAssignmentId: `assignmentId` |
| **Risk** | LOW — additive only, no existing behavior changes |
| **Test implications** | Existing cron penalty tests need to assert `PointTransaction` was created |

#### Code to insert (after line 112, before line 114):

```typescript
  // Create PointTransaction record for the penalty
  await prisma.pointTransaction.create({
    data: {
      userId: assignment.userId,
      type: 'PENALTY',
      amount: penaltyPoints,
      description: `Overdue penalty for: ${assignment.choreTemplate.title}`,
      choreAssignmentId: assignmentId,
    },
  })
```

**Optional Prisma transaction wrapping** (lines 95–112 → wrap in `$transaction`):

```typescript
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ ... })
    await tx.choreAssignment.update({ ... })
    await tx.pointTransaction.create({ ... })
  })
```

This ensures all-or-nothing atomicity for the penalty application. Without this, a crash between user.update and pointTransaction.create leaves `user.points` decremented with no audit trail.

---

### PEN-02: Guard against double penalty in completion handler

| Field | Value |
|---|---|
| **File** | `backend/src/services/chore-assignments.service.ts` |
| **Function** | `completeAssignment()` — lines 262–406 |
| **Bug** | Line 301 checks `if (isOverdue)` but does NOT check `assignment.penaltyApplied`. If cron already penalized, completion also deducts penalty. |
| **Fix type** | **Modified** (single condition change) |
| **Approach** | Change line 301 `if (isOverdue)` → `if (isOverdue && !assignment.penaltyApplied)`. This cascades to skip penalty settings fetch, points deduction, and penaltyApplied marking. |
| **Pre-condition** | The `findUnique` on line 272 already retrieves ALL scalar fields including `penaltyApplied` (default Prisma behavior when using `include` without `select`). No schema change needed. |
| **Fix location** | Line 301 |
| **Before** | `if (isOverdue) {` |
| **After** | `if (isOverdue && !assignment.penaltyApplied) {` |
| **Downstream effect** | When `penaltyApplied=true`: `penaltySettings` stays null → line 305 `penaltySettings?.overduePenaltyEnabled` is false → `pointsToDeduct` stays 0 → line 326 condition is false (no penalty deduction from award) → line 378 transaction type is `'EARNED'` → line 392 penalty marking block is skipped. All correct. |
| **Risk** | LOW — one character change, well-understood guard |
| **Test implications** | Add test: complete an assignment that has `penaltyApplied=true`, verify points = template points (no double deduction) |

---

### PEN-03: Change DEDUCTION to PENALTY type

| Field | Value |
|---|---|
| **File** | `backend/src/services/chore-assignments.service.ts` |
| **Function** | `completeAssignment()` — line 378 |
| **Bug** | Line 378: `const transactionType = (isOverdue && ...) ? 'DEDUCTION' : 'EARNED'` — should use `'PENALTY'` not `'DEDUCTION'` |
| **Fix type** | **Modified** (string literal change) |
| **Approach** | Change `'DEDUCTION'` to `'PENALTY'` |
| **Fix location** | Line 378 |
| **Before** | `const transactionType = (isOverdue && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0) ? 'DEDUCTION' : 'EARNED'` |
| **After** | `const transactionType = (isOverdue && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0) ? 'PENALTY' : 'EARNED'` |
| **Downstream effect** | Transaction history correctly shows "Penalty" instead of "Deduction" for late completions |
| **Risk** | VERY LOW — single string change, no logic alteration. Note: This string is NOT an enum in Prisma schema (SQLite doesn't support enums), so no migration needed. |
| **Test implications** | Assert PointTransaction type is `'PENALTY'` not `'DEDUCTION'` for late completions |

---

### BAL-01: Fix ADJUSTMENT handling in balance calculation

| Field | Value |
|---|---|
| **File** | `backend/src/controllers/pocket-money.controller.ts` |
| **Function** | `calculatePointBalance()` — lines 95–127 |
| **Bug** | Line 111: `case 'ADJUSTMENT':` is grouped with deductions, always treating it as negative (`totalPoints -= Math.abs(tx.amount)`). But ADJUSTMENT can be positive or negative; should follow `tx.amount` sign like EARNED/BONUS. |
| **Fix type** | **Modified** (move `case 'ADJUSTMENT'` from negative to positive group) |
| **Approach** | Remove `'ADJUSTMENT'` from the deduction switch-case (line 111) and add it to the EARNED/BONUS switch-case (lines 103–105) |

**Fix location** — lines 102–113:

**Before:**
```typescript
  switch (tx.type) {
    case 'EARNED':
    case 'BONUS':
      totalPoints += tx.amount
      break
    case 'DEDUCTION':
    case 'PENALTY':
    case 'PAYOUT':
    case 'ADVANCE':
    case 'ADJUSTMENT':
      totalPoints -= Math.abs(tx.amount)
      break
  }
```

**After:**
```typescript
  switch (tx.type) {
    case 'EARNED':
    case 'BONUS':
    case 'ADJUSTMENT':
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

**⚠️ Secondary location** — `calculateProjectedEarnings()` line 790 has same pattern:

```typescript
// Line 789-792 — also uses stale ADJUSTMENT grouping
if (tx.type === 'EARNED' || tx.type === 'BONUS') {
  periodEarnings += tx.amount
} else if (['DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE', 'ADJUSTMENT'].includes(tx.type)) {
  periodEarnings -= Math.abs(tx.amount)
}
```

**Fix for line 791:** Remove `'ADJUSTMENT'` from the array so it falls through to the `EARNED`/`BONUS` path (which now should include ADJUSTMENT):
```typescript
if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
  periodEarnings += tx.amount
} else if (['DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE'].includes(tx.type)) {
  periodEarnings -= Math.abs(tx.amount)
}
```

**Risk** | LOW for the direct fix. However, this changes the balance calculation used by `addDeduction` (line 541) and `addAdvance` (line 595) for the "sufficient points" check. If an ADJUSTMENT was previously subtracted but now added, a user might appear to have more or fewer available points for deductions. This is actually **correct** behavior — an ADJUSTMENT of +50 should increase available balance, not decrease it.

**Test implications** | Add test: ADJUSTMENT with positive amount increases balance; ADJUSTMENT with negative amount decreases balance. Verify `calculatePointBalance`, running balance, and projected earnings all agree.

---

### USR-01: Pass familyId through user creation chain

| Field | Value |
|---|---|
| **Bug** | 4 places need changes to thread `familyId` from authenticated parent → new user |
| **Fix type** | **Modified** (4 files, additive) |

#### Location 1: `backend/src/types/express.d.ts` (line 13)

Add `familyId` to the `Request.user` type:

**Before (lines 6-13):**
```typescript
user?: {
  id: number
  email: string
  name: string
  role: 'PARENT' | 'CHILD'
  points: number
  color: string | null
}
```

**After:**
```typescript
user?: {
  id: number
  email: string
  name: string
  role: 'PARENT' | 'CHILD'
  points: number
  color: string | null
  familyId: string | null
}
```

#### Location 2: `backend/src/middleware/auth.ts` (line 41)

Include `familyId` in the `authenticate` middleware's user select:

**Before (lines 35-42):**
```typescript
select: {
  id: true,
  email: true,
  name: true,
  role: true,
  points: true,
  color: true,
},
```

**After:**
```typescript
select: {
  id: true,
  email: true,
  name: true,
  role: true,
  points: true,
  color: true,
  familyId: true,
},
```

Also update the `req.user` assignment on line 66:

**Before:**
```typescript
req.user = {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as 'PARENT' | 'CHILD',
  points: user.points,
  color: user.color,
}
```

**After:**
```typescript
req.user = {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as 'PARENT' | 'CHILD',
  points: user.points,
  color: user.color,
  familyId: user.familyId,
}
```

#### Location 3: `backend/src/controllers/users.controller.ts` (line 53)

Pass `familyId` from the authenticated parent to the service call:

**Before (lines 53-60):**
```typescript
const user = await usersService.createUser({
  email,
  password: hashedPassword,
  name,
  role: role || 'CHILD',
  color: color || '#3B82F6',
  basePocketMoney: basePocketMoney || 0,
})
```

**After:**
```typescript
const user = await usersService.createUser({
  email,
  password: hashedPassword,
  name,
  role: role || 'CHILD',
  color: color || '#3B82F6',
  basePocketMoney: basePocketMoney || 0,
  familyId: req.user!.familyId,
})
```

#### Location 4: `backend/src/services/users.service.ts` (lines 100-116)

Accept `familyId` in the create interface and pass it to Prisma:

**Before (lines 100-107):**
```typescript
export const createUser = async (data: {
  email: string
  password: string
  name: string
  role: string
  color: string
  basePocketMoney: number
}): Promise<User> => {
```

**After:**
```typescript
export const createUser = async (data: {
  email: string
  password: string
  name: string
  role: string
  color: string
  basePocketMoney: number
  familyId?: string | null
}): Promise<User> => {
```

And in the `prisma.user.create` call (line 109), add `familyId`:

**Before (lines 109-115):**
```typescript
data: {
  email: data.email,
  password: data.password,
  name: data.name,
  role: data.role,
  color: data.color,
  basePocketMoney: data.basePocketMoney,
},
```

**After:**
```typescript
data: {
  email: data.email,
  password: data.password,
  name: data.name,
  role: data.role,
  color: data.color,
  basePocketMoney: data.basePocketMoney,
  familyId: data.familyId,
},
```

| Risk | LOW — additive only. `familyId` is nullable in the schema (`String?`), so existing users without familyId remain valid. Only new users created after this fix will have `familyId` set. |
| Test implications | Verify new user gets the same `familyId` as the creating parent. Verify admin dashboard queries filter correctly. |

---

### UI-01: Wire NotifConfigCard to real data

| Field | Value |
|---|---|
| **File** | `frontend/src/pages/AdminPage.tsx` |
| **Line** | 16 |
| **Bug** | `data={null}` passed to `NotifConfigCard` |
| **Fix type** | **Modified** (add fetch + wire data) |
| **Approach** | Use `useAuth()` to get current admin user's ID, call existing `GET /api/admin/users/:userId/notification-settings` endpoint, pass result to `NotifConfigCard` |

**Backend endpoint already exists:** `GET /api/admin/users/:userId/notification-settings` (see `admin.routes.ts` line 193, `admin.controller.ts` line 43). Returns shape:

```json
{
  "success": true,
  "data": {
    "settings": {
      "ntfyTopic": "...",
      "ntfyServerUrl": "...",
      "notifyChoreAssigned": true,
      "notifyChoreDueSoon": true,
      "notifyChoreCompleted": true,
      "notifyChoreOverdue": true,
      "notifyPointsEarned": true,
      "reminderHoursBefore": 2,
      ...
    }
  }
}
```

This exactly matches `NotifConfigCard`'s `NotifConfigData` interface (lines 15-17 in `NotifConfigCard.tsx`).

**Frontend changes:**

1. Import `useAuth` at top of `AdminPage.tsx`:
```typescript
import { useAuth } from '../hooks'
```

2. Get current user:
```typescript
const { user } = useAuth()
```

3. Add a new hook or inline fetch for notification settings. Simplest: add a state + effect in `AdminPage`. Or create a `useNotifSettings(userId)` hook.

**Simplest inlined approach (add to AdminPage):**

```typescript
const [notifSettings, setNotifSettings] = useState<any>(null)
const [notifLoading, setNotifLoading] = useState(false)
const [notifError, setNotifError] = useState<string | null>(null)

useEffect(() => {
  if (!user?.id) return
  setNotifLoading(true)
  apiClient.get(`/admin/users/${user.id}/notification-settings`)
    .then((res) => setNotifSettings(res.data))
    .catch((err) => setNotifError(err?.error?.message || 'Failed to load notification settings'))
    .finally(() => setNotifLoading(false))
}, [user?.id])
```

4. Change line 16:
```tsx
<NotifConfigCard data={notifSettings} loading={notifLoading} error={notifError} />
```

| Risk | LOW — existing endpoint, existing component. Only risk: `user` might be null briefly during initial auth check (the `useAuth` hook sets `loading` state). Guard with `if (!user?.id) return null` or show loading state. |
| Test implications | Verify card renders notification settings. Verify card shows "No notification config" when not configured (null ntfyTopic). Should match existing NotifConfigCard behavior. |

---

### INT-01: Dual bookkeeping — 4 endpoints don't update `user.points`

| Field | Value |
|---|---|
| **Bug scope** | **LARGER THAN DOCUMENTED.** CONCERNS.md #7 describes a "theoretical" divergence risk. In reality, 4 endpoints already diverge. |
| **File** | `backend/src/controllers/pocket-money.controller.ts` |
| **Fix type** | **Modified** (4 endpoints, additive) |

#### Verified divergence evidence

The following endpoints all create `PointTransaction` records but **do not update `user.points`**:

| Endpoint | File:Line | Creates Transaction | Updates `user.points` |
|---|---|---|---|
| `POST /api/pocket-money/bonus` | `pocket-money.controller.ts:497` | ✅ YES | ❌ NO (line 497) |
| `POST /api/pocket-money/deduction` | `pocket-money.controller.ts:547` | ✅ YES | ❌ NO (line 547) |
| `POST /api/pocket-money/advance` | `pocket-money.controller.ts:605` | ✅ YES | ❌ NO (line 605) |
| `POST /api/pocket-money/payout` | `pocket-money.controller.ts:719` | ✅ YES | ❌ NO (line 687) |

#### Impact analysis

- **`user.points` field** is stale for any user who has ever received a bonus, deduction, advance, or payout
- **`calculatePointBalance()`** (which reads PointTransaction table) is the true balance
- **Admin dashboard** (`getPointSummary` in `admin.service.ts` line 202) reads `m.points` — shows WRONG balance
- **User profile** may show different balance than transaction history
- **Transaction history** running balance is correct (reads from PointTransaction)

#### Fix approach: Update `user.points` in all 4 endpoints

**Approach:** After creating the `PointTransaction`, also update `user.points` in the same `prisma` call (or wrap in `$transaction`). The amount sign convention:
- BONUS: positive amount → `user.points += amount`
- DEDUCTION: already stored as negative in transaction → `user.points += amount` (amount is negative)
- ADVANCE: already stored as negative → `user.points += amount` (amount is negative)
- PAYOUT: already stored as negative → `user.points += amount` (amount is negative)

Since all 4 store the transaction amount with the correct sign (positive for credit, negative for debit), the fix is identical for each: after `createTransaction`, add `prisma.user.update({ where: { id: userId }, data: { points: { increment: amount } } })`.

**Fix for addBonus** (around line 497):
```typescript
// After the createTransaction call, add:
const transaction = await createTransaction(...)
await prisma.user.update({
  where: { id: targetUserId },
  data: { points: { increment: amount } },  // amount is positive
})
```

**Fix for addDeduction** (around line 547):
```typescript
const transaction = await createTransaction(...)  // amount is negative
await prisma.user.update({
  where: { id: targetUserId },
  data: { points: { increment: -amount } },  // amount is stored as negative, so invert
})
// Wait — actually amount is passed as -amount to createTransaction at line 550
// So we need to subtract: data.points = { decrement: amount } where amount is the absolute value
```

Let me re-verify. In `addDeduction`:
```typescript
const transaction = await createTransaction(
  targetUserId,
  TransactionTypes.DEDUCTION,
  -amount,  // line 550 — stored as negative
  ...
)
```

So the `PointTransaction.amount` is `-amount` (negative). To update `user.points`, we need to decrement by the original `amount` (positive):
```typescript
await prisma.user.update({
  where: { id: targetUserId },
  data: { points: { decrement: amount } },  // amount is the original positive value from body
})
```

Wait, actually there's a simpler approach. We can just look at what the transaction stores and apply the same increment. If the transaction stores `-amount`, then `points: { increment: -amount }` is correct (which decrements by `amount`).

But the cleanest approach is to use the same amount value that was passed to `createTransaction`:

For **addBonus**: amount is positive (e.g., 50) → `user.points += amount`
For **addDeduction**: `-amount` is stored (e.g., -50) → `user.points += (-amount)` = `user.points -= amount`
For **addAdvance**: `-amount` is stored → same as deduction
For **createPayout**: `-points` is stored → `user.points -= points`

So a generic approach: `user.points += transaction.amount` (where transaction.amount already has the right sign).

Actually, the simplest and most maintainable fix is to update `user.points` with the same sign as the PointTransaction:

```typescript
// After the transaction creation in addBonus:
await prisma.user.update({
  where: { id: targetUserId },
  data: { points: { increment: amount } },  // positive
})

// After the transaction creation in addDeduction:
// amount from body is positive, stored as -amount
await prisma.user.update({
  where: { id: targetUserId },
  data: { points: { decrement: amount } },  // subtract the positive amount
})

// Similarly for addAdvance and createPayout
```

**Best practice:** Wrap both operations in a `$transaction` to ensure atomicity:
```typescript
const [transaction] = await prisma.$transaction([
  createTransaction(targetUserId, type, signedAmount, options),
  prisma.user.update({ where: { id: targetUserId }, data: { points: { increment: signedAmount } } }),
])
```

Wait, but `createTransaction` returns a result. In the `$transaction` callback form:
```typescript
const result = await prisma.$transaction(async (tx) => {
  const transaction = await tx.pointTransaction.create({ ... })
  await tx.user.update({ where: { id: userId }, data: { points: { increment: amount } } })
  return transaction
})
```

This ensures both operations succeed or fail together.

#### Alternative: Read-based approach

Instead of fixing the 4 write paths, we could change all readers of `user.points` to use `calculatePointBalance()`:
- `admin.service.ts` line 202: `getPointSummary` reads `m.points` → change to call `calculatePointBalance()`
- Any other readers of `user.points` directly

**Ecosystem recommendation:** Fix the writes (dual updater pattern). This is more defensive — even if a new reader reads `user.points`, it gets the right value. The read-based approach requires identifying every reader, which is fragile.

| Risk | MEDIUM — safe change but scope is larger than documented. Each of the 4 endpoints needs a `prisma.user.update()` call added. |
| Test implications | For each endpoint: verify both `user.points` and `PointTransaction` are updated. Verify they stay in sync after multiple operations. |

---

## Build Order

The fixes have **no hard dependencies** between them (each addresses a distinct bug), but the following order minimizes merge conflicts and test rebasing:

```
Phase 1: Foundation (no behavioral changes, no test changes needed)
  1. USR-01 (4 files): Thread familyId through auth → types → controller → service
     - This is purely additive, doesn't affect existing behavior
     - Start early to get it out of the way

Phase 2: Balance correctness (changes calculation behavior)
  2. BAL-01 (1 file, 2 spots): Fix ADJUSTMENT in calculatePointBalance + projectedEarnings
     - Must be done before INT-01 write-path fixes so existing tests show correct behavior

Phase 3: Penalty pipeline (3 changes in 2 files)
  3. PEN-02 (1 line): Guard against double penalty in completeAssignment
  4. PEN-03 (1 line): Change DEDUCTION → PENALTY type in completeAssignment
  5. PEN-01 (1 file, additive): Add PointTransaction.create to cron penalty path
     - Order PEN-02 before PEN-03 because PEN-02 changes the control flow that
       determines whether the PEN-03 string is even reached

Phase 4: Dual bookkeeping (largest behavioral change)
  6. INT-01 (1 file, 4 spots): Add user.points updates to all 4 pocket-money endpoints
     - Do last because it reveals the full scope of divergence
     - Test-heavy: verify all 4 endpoints + existing completion/penalty paths

Phase 5: Frontend (no backend dependencies)
  7. UI-01 (1 file, additive): Wire NotifConfigCard in AdminPage
     - Independent of all other changes
     - Can be done in parallel with Phase 1
```

### Dependency Graph

```
USR-01 ─── independent
UI-01  ─── independent (can parallel with USR-01)
  │
BAL-01 ─── independent (but must precede INT-01 for test consistency)
  │
PEN-02 ──┐
PEN-03 ──┤  (PEN-02 and PEN-03 same file, PEN-02 changes control flow)
PEN-01 ──┘  (independent from PEN-02/PEN-03 but same domain)
  │
INT-01 ─── depends on BAL-01 being correct (to avoid cascading test failures)
```

### Merge Strategy

| Phase | Files Touched | Conflict Risk |
|---|---|---|
| 1 (USR-01) | `express.d.ts`, `auth.ts`, `users.controller.ts`, `users.service.ts` | Low — distinct files |
| 2 (BAL-01) | `pocket-money.controller.ts` | Medium — same file as INT-01 |
| 3 (PEN-02/03/01) | `chore-assignments.service.ts`, `overdue-penalty.service.ts` | Low — distinct from other phases |
| 4 (INT-01) | `pocket-money.controller.ts` (4 spots) | Medium — same file as BAL-01 |
| 5 (UI-01) | `AdminPage.tsx` | Low — standalone |

**Recommendation:** Implement in phases 1→2→3→4→5, but merge BAL-01 and INT-01 as a single commit since they're in the same file and INT-01 builds on correct BAL-01 behavior.

---

## Patterns & Anti-Patterns

### Pattern to Follow: Prisma Transactions for Atomicity

Where multiple Prisma writes must be atomic (PEN-01, INT-01), use `prisma.$transaction(async (tx) => { ... })`. This is already used in `chore-assignments.service.ts` line 331 for the completion handler — follow the same pattern.

### Anti-Pattern: Silent Divergence

The 4 pocket-money endpoints (addBonus, addDeduction, addAdvance, createPayout) demonstrate this anti-pattern: they update one representation of points (`PointTransaction`) but not the other (`user.points`). This is the same class of bug as PEN-01 (cron penalty didn't create transaction).

**Prevention rule:** Any code path that mutates point state MUST update BOTH `user.points` AND `PointTransaction` atomically.

### Anti-Pattern: Field Not Selected in Auth Middleware

`familyId` was excluded from `authenticate`'s user select. The admin dashboard controller works around this by doing a second `prisma.user.findUnique()` query on every request (see `admin.controller.ts` lines 15-18). This is an N+1 query pattern caused by the auth middleware not including the needed field.

**Prevention rule:** The `authenticate` middleware's select should include ALL fields that route handlers commonly need, unless there's a performance justification for exclusion.

---

## Source Verification

All findings in this document were verified against the actual source code files:

| File | Lines Examined | Confidence |
|---|---|---|
| `backend/src/services/overdue-penalty.service.ts` | 73-119 | HIGH — direct read |
| `backend/src/services/chore-assignments.service.ts` | 262-406 | HIGH — direct read |
| `backend/src/controllers/pocket-money.controller.ts` | 473-732 | HIGH — direct read |
| `backend/src/middleware/auth.ts` | 33-43 | HIGH — direct read |
| `backend/src/services/users.service.ts` | 100-131 | HIGH — direct read |
| `backend/src/types/express.d.ts` | 1-18 | HIGH — direct read |
| `frontend/src/pages/AdminPage.tsx` | 1-20 | HIGH — direct read |
| `frontend/src/components/admin/NotifConfigCard.tsx` | 1-104 | HIGH — direct read |
| `frontend/src/hooks/useAdmin.ts` | 1-79 | HIGH — direct read |
| `backend/src/controllers/admin.controller.ts` | 43-56 | HIGH — direct read |
| `backend/src/routes/admin.routes.ts` | 193-197 | HIGH — direct read |
| `backend/src/services/admin.service.ts` | 173-207 | HIGH — direct read |

No external sources were needed — all bugs were verified against the codebase directly.
