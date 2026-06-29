# Codebase Concerns — Homelab Reassessment

**Analysis Date:** 2026-05-03

> **Scope:** This is a reassessment for homelab family use (4-6 users, daily driving). Only concerns that would
> actually matter for a family using this app are flagged. Scalability, bundle size, library upgrades,
> and theoretical edge cases are excluded.
>
> Items from the original audit that have been confirmed fixed (v2.1.10/v2.2.0) are not re-listed.

---

## 🔴 REAL PROBLEM — Family Would Notice

### 1. Double penalty when cron job and chore completion both fire

**What happens:**
The overdue penalty cron job (`processOverdueChores`) and the chore completion handler (`completeAssignment`) can both apply penalties to the same chore, causing the child to lose points twice.

**Files:** `backend/src/services/chore-assignments.service.ts` (lines 294–328), `backend/src/services/overdue-penalty.service.ts` (lines 73–119)

**Sequence of a real-world scenario:**
1. Chore was due yesterday, child didn't do it.
2. Midnight: cron job runs `processOverdueChores()` → calls `applyOverduePenalty()` → decrements `user.points` by `-penalty` → sets `penaltyApplied=true` on the assignment. Does NOT create a `PointTransaction`.
3. Next morning: child completes the chore → `completeAssignment()` runs. It checks `isOverdue = dueDate < startOfToday` — still true. Does NOT check `penaltyApplied`.
4. `completeAssignment` then calculates `pointsToAward = templatePoints - penalty` and increments `user.points` by that amount.

**Net effect on `user.points`:** `-penalty` (from step 2) + `templatePoints - penalty` (from step 4) = `templatePoints - 2×penalty`

**What should happen:** `templatePoints - penalty` (single penalty)

**Fix approach:** In `completeAssignment()` (line 272), fetch the `penaltyApplied` field from the assignment. If it's already true, skip the penalty deduction from `pointsToAward`. The code at line 297 checks `isOverdue` but not `penaltyApplied`.

**Patch location:**
- `backend/src/services/chore-assignments.service.ts` line 272: include `penaltyApplied` in the select
- Around line 301: add `if (assignment.penaltyApplied) { penaltySettings = null }` to skip the penalty recalculation if already penalized by cron

---

### 2. `ADJUSTMENT` transaction type treated inconsistently — balance differs by endpoint

**What happens:**
Two different code paths calculate point balances differently for `ADJUSTMENT` transactions. If a parent uses "manual adjustment" to award or deduct points, the balance reported by `/api/pocket-money/balance/:userId` can differ from the running balance shown in transaction history.

**Files:** `backend/src/controllers/pocket-money.controller.ts`

**`calculatePointBalance` (lines 95–115) — used by `/balance` endpoint:**
```typescript
case 'DEDUCTION':
case 'PENALTY':
case 'PAYOUT':
case 'ADVANCE':
case 'ADJUSTMENT':
    totalPoints -= Math.abs(tx.amount)  // ADJUSTMENT = always negative
```

**Running balance (lines 396–401 and 435–441) — used by `/transactions` endpoint:**
```typescript
if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
    startingBalance += tx.amount         // ADJUSTMENT = follows amount sign
}
```

**Result:** An ADJUSTMENT with a positive amount (e.g., +50) is treated as:
- ✅ Positive in running balance (correct — it adds to balance)
- ❌ Negative in `calculatePointBalance` (incorrect — it subtracts)

A parent giving a manual +50 bonus via "adjustment" would see `€X` on the balance endpoint but `€X + 50` in the transaction history running total.

**Fix approach:** Remove `ADJUSTMENT` from the negative group in `calculatePointBalance` (line 111), making it follow the amount sign like `EARNED`/`BONUS`.

---

### 3. Overdue penalty from cron job has no transaction record

**What happens:**
When `applyOverduePenalty()` decrements `user.points`, it does **not** create a `PointTransaction`. The penalty is invisible in transaction history. A child who loses points overnight will see their balance drop with no explanation in the "View All Transactions" page.

**Files:** `backend/src/services/overdue-penalty.service.ts` (lines 73–119)

**What the code does:**
```typescript
// Lines 96-112 — decrements user.points and marks penaltyApplied
await prisma.user.update({ where: { id: assignment.userId }, data: { points: { increment: penaltyPoints } } })
await prisma.choreAssignment.update({ where: { id: assignmentId }, data: { penaltyApplied: true, penaltyPoints } })
// ❌ No PointTransaction created
```

**Fix approach:** Add a `prisma.pointTransaction.create()` call in `applyOverduePenalty()` with type `PENALTY` and amount = `penaltyPoints`.

---

## 🟡 WOULD NOTICE — Minor But Annoying

### 4. New users created by parents get no `familyId`

**What happens:**
When a parent creates a new child via `POST /api/users`, the `createUser` function in `users.service.ts` does not set `familyId`. This means the new user:
- Won't appear in admin dashboard queries that filter by `familyId`
- Gets default pocket money config instead of the family config (e.g., defaults to `MONTHLY` payout on day 1, not the actual family settings)
- Will get errors from admin dashboard features

**Files:** `backend/src/services/users.service.ts` (lines 100–130)

**Root cause:** `createUser` doesn't accept or set `familyId`. The parent's `familyId` is available via `req.user.familyId` (though currently `familyId` is not included in the `authenticate` middleware's user select — check `auth.ts` lines 33–43).

**Fix approach:**
1. Include `familyId` in the `authenticate` middleware user select (in `backend/src/middleware/auth.ts`)
2. In `users.controller.ts` `createUser`, pass `req.user.familyId` to the service
3. In `users.service.ts` `createUser`, include `familyId` in the create data

---

### 5. Penalty during completion uses "Deduction" type, not "Penalty"

**What happens:**
When `completeAssignment()` deducts a penalty from a user's points (overdue chore completed late), it creates the `PointTransaction` with type `'DEDUCTION'` instead of `'PENALTY'`. In the transaction history, this shows as "Deduction" rather than "Penalty," which is confusing.

**Files:** `backend/src/services/chore-assignments.service.ts` (line 378)

```typescript
const transactionType = (isOverdue && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0)
    ? 'DEDUCTION' : 'EARNED'
```

**Fix approach:** Change `'DEDUCTION'` to `'PENALTY'` on line 378. This way penalties always show as "Penalty" in transaction history regardless of whether they came from the cron job or inline during completion.

---

### 6. Admin page `NotifConfigCard` always shows empty

**What happens:**
The `AdminPage` hardcodes `data={null}` for `NotifConfigCard`, so it always renders "No notification config" regardless of actual configuration. This is clearly placeholder code that was never wired up.

**Files:** `frontend/src/pages/AdminPage.tsx` (line 16)

```tsx
<NotifConfigCard data={null} loading={loading} error={error} />
```

**Fix approach:** Either remove the card or wire it up by fetching notification settings for the current admin user. The backend already has `GET /api/admin/users/:userId/notification-settings`.

---

## ⚪ THEORETICAL — Low Priority But Noted

### 7. Dual bookkeeping: `user.points` field vs `PointTransaction` table

**What happens:**
The app maintains two representations of a user's points:
- `user.points` — a denormalized integer field on the `User` model
- Summing `PointTransaction` records — the normalized source of truth

Every code path that modifies points (chore completion, bonus, deduction, payout, advance, penalty) updates both. There is no reconciliation mechanism if they diverge.

**Files:** Multiple — `backend/src/services/chore-assignments.service.ts`, `backend/src/services/overdue-penalty.service.ts`, `backend/src/controllers/pocket-money.controller.ts`

**Risk for family use:** Low. In a single-user, single-threaded Node.js app with Prisma transactions, the two should stay in sync. The main risk is the penalty cron job not creating a PointTransaction (item #3 above), which is already flagged as 🔴.

**Not a priority to fix** unless evidence of divergence appears.

---

## Bottom Line: Is This App Solid for Family Use?

**Yes, but with one critical caveat.**

The **double-penalty bug** (#1) is the only issue likely to cause real frustration: a child could lose twice the expected points for a forgotten chore. If you set up recurring chores with penalties enabled, this will happen daily until addressed.

The other 🔴 items (#2, #3) cause confusing display but don't lose data.

For a quick fix **before deploying for daily family use**:
1. Fix #1 (double penalty) — ~15 minutes, one condition check
2. Fix #3 (missing PointTransaction for cron penalties) — ~10 minutes, one `create` call
3. Fix #2 (ADJUSTMENT inconsistency) — ~5 minutes, one line change

These three patches make the app safe for daily driving.

---

*Concerns audit: 2026-05-03 — homelab-focused reassessment*
