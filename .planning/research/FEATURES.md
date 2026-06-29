# Correct Behavior Specifications — Bugfix Milestone (v2.3.0)

**Domain:** Family Chore Management (Express/Prisma/React)
**Researched:** 2026-05-03
**Confidence:** HIGH (all findings verified against source code and schema)

## Overview

This document defines the **correct expected user-facing behavior** for each of the 7 bugs targeted in milestone v2.3.0. These specs serve as the acceptance criteria for fixes, test cases, and validation.

---

## Bug 1: Double Penalty (PEN-02 — 🔴 REAL PROBLEM)

### What the user sees today (broken)
A child has a chore worth 10 points, due yesterday, with penalty multiplier of 2:

1. **Midnight:** Cron applies penalty. `user.points` drops by -20. Child sees balance drop but no transaction explaining it (bug #3 compounds).
2. **Next morning:** Child completes the chore. `user.points` changes by `+10 - 20 = -10`. Net change: was -20, then another -10 → total -30.
3. **Net result on `user.points`:** `templatePoints - 2×penalty` = `10 - 40 = -30`
4. **What should happen:** `templatePoints - penalty` = `10 - 20 = -10`

### Correct behavior (after fix)

| Event | `user.points` change | Transaction created | `penaltyApplied` |
|-------|---------------------|-------------------|-----------------|
| Midnight cron | -20 (penalty) | Yes (PENALTY, -20) | true |
| Child completes next day | +10 (earned, no penalty) | Yes (EARNED, +10, or PENALTY depending on fix #5) | already true — skipped |

**Net effect to child's points:** `-20 (cron) + 10 (completion) = -10`

### User-visible acceptance criteria
- **Child's point balance:** Drops by exactly `penalty` points total after both events, not `2×penalty`.
- **Transaction history shows:**
  - A PENALTY entry for the cron application (-20 points)
  - An EARNED entry for the completion (+10 points)
- **The `completeAssignment` handler checks `penaltyApplied` before applying in-line penalty.** If the cron already set it, the completion awards full template points minus any previously-applied penalty (i.e., no second deduction).
- **The `completeAssignment` transaction does NOT set `penaltyApplied` or `penaltyPoints` a second time** — only the cron should mark these, and the completion should respect the existing flag.

### Test scenario
```
Setup: 10-pt chore due yesterday, penalty multiplier = 2
Cron runs:
  - user.points: 100 → 80
  - PointTransaction: PENALTY, -20
  - penaltyApplied: false → true

Child completes chore:
  - completeAssignment fetches penaltyApplied = true
  - skips: pointsToAward = 10 - 20  (does NOT run)
  - uses: pointsToAward = 10
  - user.points: 80 → 90
  - PointTransaction: EARNED, +10

Result: user.points went 100 → 90 (net -10 = templatePoints - penalty)
NOT: 100 → 70 (which would be templatePoints - 2×penalty)
```

### Related bugs
- **Bug #3 (missing penalty transaction):** Required prerequisite — cron must create `PointTransaction` for the penalty, otherwise the cron penalty is invisible.
- **Bug #5 (wrong penalty type):** The completion's penalty transaction type should be `'PENALTY'` for consistency.

---

## Bug 2: ADJUSTMENT Inconsistency (BAL-01 — 🔴 REAL PROBLEM)

### What the user sees today (broken)
Parent gives a manual +50 point adjustment to Alice (balance was 100):

- **Balance endpoint** (`GET /api/pocket-money/balance/:id`): Shows **50** — WRONG.
  - Reason: `calculatePointBalance()` treats ALL `ADJUSTMENT` as negative: `totalPoints -= Math.abs(tx.amount)`.
- **Transaction history** (running balance): Shows **150** — CORRECT.
  - Reason: Running balance code follows `tx.amount` sign for `ADJUSTMENT`.
- **Parent sees DIFFERENT numbers** on different screens. Confusing and erodes trust.

### Correct behavior (after fix)
Both endpoints must agree. When a parent adjusts +50:

| Endpoint | Balance | Running balance | Match? |
|----------|---------|-----------------|--------|
| `/api/pocket-money/balance/:id` | 150 | — | ✅ |
| Transaction history last row | — | 150 | ✅ |

### User-visible acceptance criteria
- **`calculatePointBalance()` removes `ADJUSTMENT` from the "always subtract" group** — let it follow the sign of `tx.amount` like `EARNED` and `BONUS`.
- **Balance endpoint and transaction history show the same value** for any set of transactions including ADJUSTMENTs.
- **Negative ADJUSTMENTs still work correctly:** an ADJUSTMENT of -30 reduces balance by 30.
- **`projectedEarnings` (which also uses `calculatePointBalance`) is fixed as a side effect.**

### Affected code paths
| Path | Line | Current behavior | Fixed behavior |
|------|------|-----------------|----------------|
| `calculatePointBalance()` switch | 111 | `ADJUSTMENT` → subtract always | Follow `amount` sign |
| Transaction running balance (page boundary) | 397 | Already correct (`ADJUSTMENT` → follow sign) | No change |
| Transaction running balance (page) | 436 | Already correct | No change |
| Transaction running balance (map) | 444 | Already correct | No change |
| `calculateProjectedEarnings` period calc | 790 | Same bug as `calculatePointBalance` | Fixed via shared code |

---

## Bug 3: Missing Penalty Transaction (PEN-01 — 🔴 REAL PROBLEM)

### What the user sees today (broken)
Child has chore due yesterday, penalty multiplier = 2:

1. Midnight cron applies penalty.
2. **Child wakes up:** balance dropped from 100 to 80.
3. **Child checks "View All Transactions":** Empty — no explanation for the -20.
4. **If the child has a notification**, they get an in-app alert saying "Penalty Applied" — but there's no permanent record of it.

### Correct behavior (after fix)
- **`applyOverduePenalty()` creates a `PointTransaction` record** with:
  - `type`: `'PENALTY'`
  - `amount`: `penaltyPoints` (negative, e.g., -20)
  - `description`: `"Penalty for: {choreTitle}"` (or similar meaningful text)
  - `userId`: the child's ID
  - `choreAssignmentId`: the overdue assignment's ID
- **Transaction history shows the penalty entry** alongside other transactions, in chronological order.
- **The penalty entry carries through to balance calculations** in both `calculatePointBalance()` and running balance.

### User-visible acceptance criteria
- **Transaction history includes a penalty entry** with type "Penalty" and the correct negative amount.
- **Penalty is applied atomically within the same database transaction** as the `user.points` decrement and the `penaltyApplied` flag update.
- **Balance endpoint reflects the penalty** (it already would since it sums all transactions — but now there's a transaction to sum).

### Test scenario
```
Before: user.points = 100, chore due yesterday, 10 pts, multiplier = 2

Cron runs applyOverduePenalty():
  - user.points: 100 → 80  (-20)
  - choreAssignment.penaltyApplied: false → true
  - choreAssignment.penaltyPoints: null → -20
  - PointTransaction: CREATED
      type: "PENALTY"
      amount: -20
      userId: child.id
      choreAssignmentId: assignment.id

Child views transactions:
  - Sees: "PENALTY: -20" with description "Penalty for: Clean Bedroom"
  - Running balance reflects the -20

Balance endpoint:
  - calculatePointBalance() includes the -20 PENALTY
  - Result: 80 (matches user.points)
```

### Important detail
The `applyOverduePenalty()` function already has a **guard** against double-penalty at line 87:
```typescript
if (assignment.penaltyApplied) {
  throw new AppError('Penalty has already been applied to this assignment', 409, 'ALREADY_PENALIZED')
}
```
This guard means the `PointTransaction` creation will also only fire once per assignment — correct behavior.

---

## Bug 4: Missing familyId (USR-01 — 🟡 WOULD NOTICE)

### What the user sees today (broken)
Parent creates a new child account "Charlie" via the admin panel:

1. **Parent immediately looks at admin dashboard:** Charlie is NOT listed in the chore stats or point summary members.
2. **Root cause:** The new user's `familyId` is `null`, but `getChoreStats()` queries `where: { familyId }` and `getPointSummary()` also filters by `familyId`.
3. **Parent has to restart the app** (or wait for seed re-run) for Charlie to be linked to the family.
4. **Charlie also gets default pocket money config** instead of family's config (e.g., defaults to `MONTHLY` payout on day 1 instead of actual family settings like day 15).

### Correct behavior (after fix)
- **New users created by parents inherit the parent's `familyId`.**
- **The user immediately appears** in admin dashboard queries that scope by `familyId`.
- **The user gets the family pocket money config** automatically via the `familyId` relation.

### Three things to fix

| Fix Location | What to Change | Why |
|-------------|----------------|-----|
| `auth.ts` middleware | Add `familyId` to the `select` in `authenticate()` | So `req.user.familyId` is available |
| `users.controller.ts` `createUser` | Pass `req.user.familyId` to the service | So the service knows what family to assign |
| `users.service.ts` `createUser` | Accept and set `familyId` in the create data | So it's stored in the DB |

### User-visible acceptance criteria
- **Create Charlie as child:** Dashboard shows Charlie in member lists immediately.
- **Pocket money config for Charlie:** Inherits family settings (same as other kids).
- **Audit log shows Charlie's user creation** with correct admin attribution (already works, doesn't depend on `familyId`).

### Test scenario
```
Seed: Default family "The Family" with id "default-family"
Log in as Dad (parent, familyId: "default-family", id: 1)

POST /api/users { name: "Charlie", email: "charlie@home.local", role: "CHILD" }
  → createUser req.body, passes familyId: "default-family" from req.user.familyId
  → Charlie.familyId = "default-family"  (was null before)

GET /api/admin/dashboard
  → getChoreStats("default-family") finds Charlie in prisma.user.findMany({where:{familyId}})
  → getPointSummary("default-family") finds Charlie in prisma.user.findMany({where:{familyId}})
  → Charlie appears in both memberBreakdown and memberBalances
```

---

## Bug 5: Wrong Penalty Type (PEN-03 — 🟡 WOULD NOTICE)

### What the user sees today (broken)
Child completes an overdue chore that incurs a penalty:

- **Transaction history shows:** "Deduction: -20" (type `'DEDUCTION'`)
- **What child expects:** "Penalty: -20" (type `'PENALTY'`)
- **Confusing:** Child doesn't know if this was a parent-applied deduction or an automatic penalty.

### Correct behavior (after fix)
- **`completeAssignment()` creates transaction with type `'PENALTY'` instead of `'DEDUCTION'`** when the deduction is due to late completion.
- **Transaction history shows "Penalty"** — consistent with cron-applied penalties (bug #3).
- **The `DEDUCTION` type is reserved** for parent-initiated manual deductions via the pocket money management UI.

### What changes

**File:** `backend/src/services/chore-assignments.service.ts` **Line 378:**

```typescript
// BEFORE (broken):
const transactionType = (isOverdue && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0)
    ? 'DEDUCTION' : 'EARNED'

// AFTER (fixed):
const transactionType = (isOverdue && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0)
    ? 'PENALTY' : 'EARNED'
```

### User-visible acceptance criteria
- **Late completion penalty shows as "Penalty"** in transaction history, not "Deduction".
- **Parent-initiated deduction** (via pocket money management) still shows as "Deduction" — unchanged.
- **Running balance calculations are unaffected** — both `DEDUCTION` and `PENALTY` are in the same "subtract" group in balance calculations.

### Transaction type semantics (after fix)

| Type | Source | Description |
|------|--------|-------------|
| `EARNED` | Chore completion (on time or partial) | Points earned normally |
| `PENALTY` | **Cron: overdue chore** or **Late completion** (was `DEDUCTION`) | Automatic deduction for lateness |
| `DEDUCTION` | Parent manual deduction | Parent chose to deduct points |
| `BONUS` | Parent manual bonus | Parent chose to award extra points |
| `PAYOUT` | Payout executed | Points converted to money |
| `ADVANCE` | Advance payment | Negative balance allowed |
| `ADJUSTMENT` | Manual balance adjustment | Can be positive or negative |

---

## Bug 6: NotifConfigCard Empty (UI-01 — 🟡 WOULD NOTICE)

### What the user sees today (broken)
Admin dashboard shows **6 cards**. The **NotifConfigCard** always says _"No notification config"_ — even when the admin user has notification settings configured:

```tsx
// AdminPage.tsx line 16 — hardcoded null
<NotifConfigCard data={null} loading={loading} error={error} />
```

### Correct behavior (after fix)
The admin dashboard should display the **admin user's own notification settings** in the NotifConfigCard.

**Backend endpoint already exists:** `GET /api/admin/users/:userId/notification-settings` (see `admin.controller.ts` lines 43–56).

This endpoint:
1. Fetches `UserNotificationSettings` for the given user (creating defaults if none exist)
2. Strips credential fields (`ntfyPassword`, `ntfyUsername`, `emailNotifications`, `notificationEmail`)
3. Returns the safe settings object

### What needs to change

**Frontend:**
- `AdminPage.tsx`: Remove `data={null}`, fetch settings for the current admin user
- Add a hook or inline fetch to call `GET /api/admin/users/:userId/notification-settings` with the current user's ID

**No backend changes needed** — the endpoint already works correctly.

### User-visible acceptance criteria
- **Admin dashboard NotifConfigCard shows:**
  - ntfy channel topic (if configured)
  - ntfy server URL (if not default)
  - Notification preference toggles (Chore Assigned, Due Soon, Completed, Overdue, Points Earned) — shown as green/gray badges
  - Reminder hours before due date
- **If admin has no notification settings:** Shows defaults (all toggles on, default values) — the `getOrCreateSettings()` in the backend auto-creates defaults.
- **Card works as part of the auto-refresh cycle** (30-second interval from `useAdminDashboard`).

### Response shape (already exists)
```
GET /api/admin/users/:userId/notification-settings
{
  "success": true,
  "data": {
    "settings": {
      "ntfyTopic": "mychores" | null,
      "ntfyServerUrl": "https://ntfy.sh",
      "notifyChoreAssigned": true | false,
      "notifyChoreDueSoon": true | false,
      "notifyChoreCompleted": true | false,
      "notifyChoreOverdue": true | false,
      "notifyPointsEarned": true | false,
      "reminderHoursBefore": 2
    }
  }
}
```

### Related
- Frontend `NotifConfigCard.tsx` component — already handles all states (loading, error, empty data, data with settings) correctly. Only the `data` prop was hardcoded to `null`.

---

## Bug 7: Dual Bookkeeping (INT-01 — ⚪ THEORETICAL)

### The core question
**Is `user.points` the canonical balance, or is `SUM(PointTransaction)`?**

### Answer
**`SUM(PointTransaction)` IS the canonical balance.** The `user.points` field on the `User` model is a **denormalized cache** — it exists for fast reads (avoid summing all transactions every time a user views their balance).

### What the evidence shows

| Evidence | `user.points` | `SUM(PointTransaction)` |
|----------|--------------|------------------------|
| Admin dashboard `getPointSummary()` | Uses `m.points` (fast) | ❌ Not used |
| Balance endpoint `getPointBalance()` | ❌ Not used | Uses `calculatePointBalance()` which sums transactions |
| Running balance in transaction history | ❌ Not used | Sums transactions page-by-page |
| Completion handler `completeAssignment()` | Updates both atomically | Creates PointTransaction |
| Cron penalty `applyOverduePenalty()` (current bug) | Updates | ❌ Does NOT create transaction (bug #3) |
| Bonus/Deduction `addBonus()` / `addDeduction()` | ❌ Does NOT update `user.points` | Creates PointTransaction |

### Current state of divergence risk

| Risk | Current Status | After Bug Fixes |
|------|---------------|-----------------|
| Bug #3: Cron penalty skips transaction | `user.points` has penalty, no transaction record | `user.points` and transaction in sync |
| Completion handler: updates `user.points` + creates transaction | Atomic in Prisma transaction — in sync | Unchanged — still atomic |
| Bonus/Deduction: creates transaction but no `user.points` update | `user.points` may LAG behind canonical balance | ⚠️ **Still broken** — needs fixing |
| Balance endpoint uses canonical (transactions) | Correct by definition | Correct |
| Admin dashboard uses `user.points` | May differ from balance endpoint | Needs reconciliation |

### What correct behavior looks like (strategic)

**Option A: Make `user.points` a computed/dropped field (recommended for safety)**
- Remove `user.points` from the User model
- All reads compute from `SUM(PointTransaction)`
- Simplifies the data model, eliminates divergence entirely
- Performance impact: SQLite on homelab hardware, 4-6 users, <10K transactions/year — negligible
- **Risk:** Changes the schema; affects every query that reads `user.points`

**Option B: Every code path updates both atomically (simplest fix)**
- Fix `addBonus`, `addDeduction`, `addAdvance`, `createPayout` to also update `user.points`
- Add a `reconcilePoints` function that syncs `user.points` from transactions
- Run reconciliation in a cron job or periodically
- **Risk:** Continues to rely on manual discipline for updates

**Option C: Change admin dashboard to use canonical balance**
- `getPointSummary()` computes balance from transactions instead of reading `user.points`
- Reconcile `user.points` as a one-time data migration
- **Risk:** Dashboard becomes slightly slower

### User-visible acceptance criteria (minimum for this milestone)

1. **After all bug fixes, every code path that affects points creates BOTH a `user.points` update AND a `PointTransaction` record.** The two representations stay in sync.

2. **Admin dashboard `getPointSummary()` should NOT use `user.points`** — it should compute from `PointTransaction` or a reconciliation function should ensure `user.points` is always correct.

3. **If Option A or C is chosen:** A user viewing their balance on the admin dashboard and their balance via the pocket money screen sees the **same number**.

### Remaining gaps (not fixed by this milestone's other 6 bugs)

| Operation | Updates `user.points`? | Creates PointTransaction? | After all 7 fixes |
|-----------|----------------------|-------------------------|-------------------|
| Chore completion | ✅ Yes (line 367) | ✅ Yes (line 379) | ✅ Fixed |
| Cron penalty (bug #3) | ✅ Yes (line 96) | ✅ Yes (fix #3) | ✅ Fixed |
| Bonus | ❌ No | ✅ Yes | ❌ **Still gap** |
| Deduction | ❌ No | ✅ Yes | ❌ **Still gap** |
| Advance | ❌ No | ✅ Yes | ❌ **Still gap** |
| Payout | ❌ No | ✅ Yes | ❌ **Still gap** |
| Adjustment | ❌ No | ❌ No¹ | ❌ **Still gap** |

¹ `ADJUSTMENT` is not implemented as a frontend action in the current codebase; it's a transaction type constant defined in `pocket-money.controller.ts` (line 56) but there's no API handler that creates ADJUSTMENT transactions.

**For this milestone:** The minimum fix is to ensure the admin dashboard (`getPointSummary`) reads from the canonical source (transactions), OR to add user.points updates to the bonus/deduction/advance/payout handlers. The CONCERNS.md rates this as LOW priority — it's noted for awareness but fixing all 6 other bugs brings the system to ~90% consistency.

---

## Feature Dependency Map

```
Bug #3 (Missing penalty transaction)
    └──prerequisite──> Bug #1 (Double penalty)
                        └──both modify──> completeAssignment's penalty logic

Bug #5 (Wrong penalty type)
    └──related──> Bug #3 (both affect PENALTY transaction creation paths)

Bug #3 (Missing penalty transaction)
    └──prerequisite──> Bug #7 (Dual bookkeeping — one divergence source is fixed)

Bug #4 (Missing familyId)
    └──independent──> Bug #6 (NotifConfigCard) — different stack layer

Bug #2 (ADJUSTMENT inconsistency)
    └──independent──> Bug #1, #3, #5 (different code path)

Bug #6 (NotifConfigCard empty)
    └──independent──> All others (pure frontend bug)
```

### Implementation ordering rationale
1. **Bug #3 first** (foundation — cron needs to log its work before we can prevent double-penalty correctly)
2. **Bug #5 second** (trivial one-line fix, aligns penalty type semantics)
3. **Bug #1 third** (depends on #3 — double-penalty check is meaningless without transaction logging for the cron penalty)
4. **Bug #2 fourth** (adds correctness to ADJUSTMENT type; independent but small)
5. **Bug #4 fifth** (small change across 3 files; independent)
6. **Bug #6 sixth** (frontend-only, independent)
7. **Bug #7 last** (strategic decision, may be deferred; depends on #3 being fixed for one of the divergence sources)

---

## Detailed Acceptance Criteria by Bug

| Bug | User Story | Acceptance | Verification |
|-----|-----------|------------|-------------|
| 1 | As a child, I shouldn't lose double points for one overdue chore | Points change = template - single penalty | `calculateAndAssert(user.points)` |
| 2 | As a parent, I want balance and transaction history to show the same number | Both endpoints agree after an ADJUSTMENT | Compare `/balance` and `/transactions` running total |
| 3 | As a child, I want to see why my balance dropped overnight | Transaction history includes PENALTY entry | Query `PointTransaction` for the assignment |
| 4 | As a parent, new children appear in the admin dashboard immediately | Dashboard shows new user in member lists | E2E: create user → check dashboard |
| 5 | As a child, late penalties should say "Penalty" not "Deduction" | Transaction type = `'PENALTY'` | Inspect transaction type in DB |
| 6 | As a parent, I want to see my notification settings in the dashboard | Card shows actual settings, not "No config" | Visual inspection |
| 7 | As a user, my balance should be consistent everywhere | `user.points` ≈ `SUM(PointTransaction)` | Reconciliation query |

---

## Sources

- **Source code analyzed:**
  - `backend/src/services/chore-assignments.service.ts` (lines 262–406) — completion handler
  - `backend/src/services/overdue-penalty.service.ts` (lines 73–119) — penalty application
  - `backend/src/controllers/pocket-money.controller.ts` (lines 95–127, 396–448) — balance calculation and running balance
  - `backend/src/services/users.service.ts` (lines 100–130) — user creation
  - `backend/src/controllers/users.controller.ts` (lines 41–78) — controller for user creation
  - `backend/src/middleware/auth.ts` (lines 33–43) — authenticate middleware select
  - `frontend/src/pages/AdminPage.tsx` (line 16) — hardcoded null
  - `frontend/src/components/admin/NotifConfigCard.tsx` — card component
  - `backend/src/controllers/admin.controller.ts` — notification settings endpoint
  - `backend/src/services/admin.service.ts` — dashboard data assembly
  - `backend/prisma/schema.prisma` — data model
- **CONCERNS.md** — bug descriptions and fix approaches (verified against source code)
- **PROJECT.md** — milestone scope definitions
