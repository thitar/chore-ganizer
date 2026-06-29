# PITFALLS: Chore-Ganizer Bugfix Milestone (v2.3.0)

**Domain:** Family chore management app (Express/Prisma/React)
**Researched:** 2026-05-03
**Overall confidence:** HIGH (all source code directly analyzed)

> Per-fix pitfalls analysis for the 7 targeted bugfixes. Each fix's specific risks,
> warning signs, test impacts, and recovery strategies. See CONCERNS.md for root
> cause descriptions of each bug.

---

## CRITICAL: Cross-Cutting Risks

These apply to ALL fixes and should be addressed before starting any work:

### Risk A: Dead code / wrong file detection
**What:** Fixing the wrong file or missing that there's already a fix in progress on
another branch.
**Mitigation:** Verify current branch is `v2.3.0` (or whatever the milestone branch is).
Run `git status` before each fix to confirm no stashed/in-progress changes.

### Risk B: Mock hell — unit test setup doesn't match reality
**What:** Every fix modifies code that has existing unit tests with different Prisma
mock surfaces. If a mock doesn't include a new Prisma method call, tests fail
silently or with confusing errors.
**Mitigation:** For each fix, identify all affected test files and update their
mocks BEFORE running tests (see per-fix "Test Impact" sections).

### Risk C: Integration test database state pollution
**What:** Integration tests share a common seed database. Fixes that change data model
behavior (especially USR-01 and INT-01) may cause tests to behave differently
depending on test ordering.
**Mitigation:** Run integration tests serially (`--runInBand`). Refresh seed data
between test blocks.

---

## PEN-01: Overdue cron penalty creates PointTransaction

**Location:** `backend/src/services/overdue-penalty.service.ts` — `applyOverduePenalty()` (lines 73–119)

### Pitfall 1.1: No transactional atomicity (🔴 CRITICAL)

**What goes wrong:** The current `applyOverduePenalty()` makes TWO separate Prisma calls
(user.update and choreAssignment.update) without a `$transaction`. Adding a third
call (pointTransaction.create) as an independent write creates a window where:
- User points decremented ✓
- Assignment marked as penaltyApplied ✓
- **PointTransaction.create FAILS** ✗ (transient error, constraint violation, etc.)

**Result:** Penalty is deducted from visible balance but invisible in transaction
history. Kid sees unexplained balance drop; no reconciliation mechanism exists.

**Prevention:** Wrap ALL three writes (user.update, choreAssignment.update,
pointTransaction.create) in `prisma.$transaction()`. If one fails, all roll back.

**Detection:** SQLite constraint errors, network timeouts during cron execution.
Monitor cron job error logs for Prisma errors.

**Recovery:** If deployed without transaction: manually reconcile by computing
`SUM(PointTransaction.amount)` vs `user.points` for affected users. Add a
one-time reconciliation query to the release notes.

### Pitfall 1.2: Wrong amount sign in PointTransaction

**What goes wrong:** `penaltyPoints` at line 93 is already negative
(`-Math.round(Math.abs(rawPenalty))`). But other code paths use different sign
conventions:
- Deduction controller: stores `-amount` (negative)
- Advance controller: stores `-amount` (negative)
- Payout controller: stores `-amount` (negative)
- CompleteAssignment: stores `pointsToAward` (positive) with type 'DEDUCTION'

If we store the already-negative `penaltyPoints` as the PointTransaction amount,
the running balance calculation in `getTransactionHistory` (lines 436–441)
will correctly subtract it (since the ELSE branch subtracts any non-EARNED/BONUS/
ADJUSTMENT type). But `calculatePointBalance` (line 112) does
`totalPoints -= Math.abs(tx.amount)` — which would turn our negative value into
a positive before subtracting, which is WRONG (double-negative).

**Wait — check this carefully:**
- `totalPoints -= Math.abs(tx.amount)` where `tx.amount` = -20
- `Math.abs(-20)` = 20
- `totalPoints -= 20` → subtracts 20 from total (correct behavior for a penalty)

So actually storing -20 is fine for `calculatePointBalance`. And for the running
balance (line 438): `runningBalance -= tx.amount` where tx.amount = -20
→ `runningBalance -= (-20)` → `runningBalance += 20` ❌ **WRONG!**

The running balance code on line 438 would ADD the penalty back to the running
total instead of subtracting it. The running balance code treats PENALTY the same as
DEDUCTION, PAYOUT, ADVANCE — they all hit the ELSE branch which does
`runningBalance -= tx.amount`. Since our amount is already negative, this becomes
addition.

**Root cause:** Different code paths have inconsistent conventions. `calculatePointBalance`
uses `-= Math.abs(tx.amount)` (always positive subtraction). Running balance uses
`-= tx.amount` (sign-dependent).

**Prevention:** Store the penalty as a NEGATIVE amount in PointTransaction, matching
the DEDUCTION pattern (pocket-money controller stores `-amount`). The running balance
code will then compute `runningBalance -= (-20)` = `runningBalance += 20` which is WRONG.

**THE RIGHT APPROACH:** Store the ABSOLUTE VALUE (positive integer) in the
PointTransaction, with type 'PENALTY'. The balance calculation code handles
'PENALTY' by subtracting `Math.abs(amount)` or using `-= amount` in the ELSE branch.
This ensures:
- `calculatePointBalance`: `-= Math.abs(positiveValue)` → subtracts correctly
- Running balance: `-= positiveValue` → subtracts correctly

Both paths agree: a PENALTY with `amount = 20` (positive) is subtracted correctly
everywhere. This matches how DEDUCTION is stored in the controller (with sign
embedded in type, not amount).

Wait — DEDUCTION stores `-amount` in the controller (line 550: `-amount`). So
DEDUCTION with `amount = 20` is stored as `-20`. Let me re-verify the running
balance code:

Line 436-440:
```typescript
if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
    runningBalance += tx.amount
} else {
    runningBalance -= tx.amount
}
```

For a DEDUCTION with `amount = -20`: `runningBalance -= (-20)` = `runningBalance + 20`.
But DEDUCTION should LOWER the balance...

Actually, looking at `calculatePointBalance` (line 107-112):
```typescript
case 'DEDUCTION':
case 'PENALTY':
    totalPoints -= Math.abs(tx.amount)
```
With `amount = -20`: `totalPoints -= Math.abs(-20)` = `totalPoints - 20` ✓

So `calculatePointBalance` handles negative amounts correctly, but the running
balance code does NOT. The running balance code has a bug: it assumes all amounts
in the ELSE branch are positive and need to be subtracted. But DEDUCTION, ADVANCE,
and PAYOUT all store negative amounts.

This means the running balance is ALREADY buggy for DEDUCTION, ADVANCE, and PAYOUT
transactions! For example:
1. Start balance = 0
2. Add BONUS of +50: runningBalance = 0 + 50 = 50
3. Add DEDUCTION with amount -20: runningBalance = 50 - (-20) = 70 ← WRONG, should be 30

This is a pre-existing bug in the running balance calculation! But we need to be
consistent: if the running balance is already wrong for DEDUCTION, our new PENALTY
should follow the same pattern to avoid making the running balance MORE wrong.

**Verdict:** Store penalty as NEGATIVE amount (matching DEDUCTION convention) so it's
consistent with the existing (buggy) running balance. The alternative (store positive
and fix running balance) is scope creep beyond PEN-01.

Actually wait — let me re-read the running balance more carefully.

Lines 434-441:
```typescript
let runningBalance = 0
for (const tx of allPriorTx) {
    if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
        runningBalance += tx.amount
    } else {
        runningBalance -= tx.amount
    }
}
```

So:
- EARNED amount = +10 → runningBalance += 10 ✓
- BONUS amount = +50 → runningBalance += 50 ✓
- DEDUCTION amount = -20 → runningBalance -= (-20) = runningBalance + 20 ← ❌
- PAYOUT amount = -50 → runningBalance -= (-50) = runningBalance + 50 ← ❌

This is indeed the sign bug that CONCERNS.md describes for ADJUSTMENT but exists
more broadly. The DEDUCTION, PAYOUT, ADVANCE, PENALTY amounts are all stored as
negative, and `-=` would double-count them in the wrong direction.

But wait — the existing code ALREADY creates DEDUCTION transactions from
`completeAssignment()` with `amount = pointsToAward` (positive, line 380):
```typescript
amount: pointsToAward, // positive!
```
And type = 'DEDUCTION'. So for completion penalties, the amount is positive
and type is DEDUCTION. Then `runningBalance -= pointsToAward` subtracts
correctly.

So the convention for DEDUCTION in the completion handler is: POSITIVE amount
with DEDUCTION type. The running balance code works correctly for this.

But in the pocket-money controller, DEDUCTION stores `-amount` (negative). So:

- DEDUCTION from completion: amount = +8, type = 'DEDUCTION' → runningBalance -= 8 ✓
- DEDUCTION from controller: amount = -20, type = 'DEDUCTION' → runningBalance -= (-20) ❌

**Bottom line:** There's an INCONSISTENCY in how DEDUCTION is stored depending on
which code path creates it. The completion handler stores positive amounts; the
controller stores negative amounts. Both use type 'DEDUCTION'.

For PEN-01, we need to pick one convention. Since we're storing a PENALTY type
(not DEDUCTION), and `calculatePointBalance` handles both positive and negative
amounts (via `Math.abs`), the safest approach is to store a POSITIVE amount with
type 'PENALTY'. This matches the completion handler's DEDUCTION pattern and
avoids the negative-amount double-subtraction in the running balance.

**Final verdict:** Store `amount: Math.abs(penaltyPoints)` (positive integer),
type: 'PENALTY'. This is consistent with the completion handler's pattern and
works correctly with both balance calculation methods.

### Pitfall 1.3: PointTransaction mock missing from tests

**What goes wrong:** The existing unit test at
`backend/src/__tests__/services/overdue-penalty.service.test.ts` mocks
`prisma.pointTransaction.create` is NOT in the mock (lines 21-37). Adding the
create call will cause the mock to return `undefined` (default jest mock return),
causing Prisma to throw "Cannot read properties of undefined" when trying to
access `.create`.

**Affected tests:**
- "should use integer math for penalty calculation (no floating point)" (line 317)
- "should calculate penalty correctly for whole number multipliers" (line 362)
- "should throw error if assignment not found" (line 392)
- "should throw an error if penalty has already been applied" (line 293)

All of these call `applyOverduePenalty()` which now needs
`prisma.pointTransaction.create` to be mocked.

**Prevention:** Add to the mock (line 21-37):
```typescript
pointTransaction: {
    create: jest.fn().mockResolvedValue({ id: 1, ...mockTransactions.earned }),
},
```

Also add `$transaction: jest.fn((cb) => cb(mockTx))` if we wrap in a transaction.

### Pitfall 1.4: Description text inconsistency

**What goes wrong:** The PointTransaction description for cron penalties should be
consistent with the completion handler's description format (line 384-386):
```
"Completed: Wash Dishes (penalty: -20 pts)"
```
But for cron, the chore isn't "completed" — it's just a penalty for being overdue.
A separate format is clearer:
```
"Overdue penalty: Wash Dishes (-20 pts)"
```

**Prevention:** Use a distinct description that matches the notification message
pattern in `notifyChildOfPenalty` (line 189).

### Pitfall 1.5: applyOverduePenalty is called inside processOverdueChores loop

**What goes wrong:** The `processOverdueChores` function (line 216-304) calls
`applyOverduePenalty()` inside a `for` loop. If any single assignment's penalty
fails (e.g., foreign key violation on pointTransaction.userId), the error is
caught by the try/catch on line 294 and logged. The function continues processing
other assignments. BUT: `applyOverduePenalty` already modified `user.points` and
`choreAssignment.penaltyApplied` in the first two (non-transactional) calls BEFORE
the PointTransaction.create failure. This leaves partial state.

**Prevention:** The `$transaction` wrapping (Pitfall 1.1) prevents this — if any
write fails, all roll back. Ensure `applyOverduePenalty` becomes atomic.

---

## PEN-02: penaltyApplied guard in completion handler

**Location:** `backend/src/services/chore-assignments.service.ts` — `completeAssignment()` (lines 262–406)

### Pitfall 2.1: Guard placement affects transaction type (🔴 CRITICAL)

**What goes wrong:** The guard `!assignment.penaltyApplied` must be added to TWO
conditions, not just one:

1. **Line 326** (points deduction): `if (isOverdue && penaltySettings?.overduePenaltyEnabled && pointsToDeduct > 0)`
   — adding `&& !assignment.penaltyApplied` here prevents double-deducting points.

2. **Line 378** (transaction type): The ternary on line 378 determines whether the
   transaction shows as 'EARNED' or 'DEDUCTION'. If `penaltyApplied` is true but
   this condition doesn't check it, the transaction will show as 'DEDUCTION' (with
   zero deduction, since pointsToDeduct=0) instead of 'EARNED'.

3. **Lines 384-386** (description): Same ternary — the description would say
   "(penalty: -0 pts)" when no penalty was applied.

4. **Lines 392-399** (penaltyApplied update): This block sets `penaltyApplied: true`
   AGAIN and overwrites `penaltyPoints` with `-pointsToDeduct` (which would be 0).
   This would **clear the existing penaltyPoints value** on the assignment record!

**Worst case:** If only the points deduction (1) is guarded but not (2-4):
- Points are NOT double-deducted ✓ (good)
- Transaction type is 'DEDUCTION' for full points ❌ (confusing: shows as
  "Deduction" with no actual deduction)
- `penaltyPoints` on the assignment is overwritten to 0 ❌ (loses the true penalty
  amount)
- Existing `penaltyApplied: true` stays true ✓ (no harm)

**Prevention:** The safest approach is to null out `penaltySettings` early when
`penaltyApplied` is true. This collapses all downstream conditions naturally:
```typescript
if (isOverdue && assignment.penaltyApplied) {
    penaltySettings = null  // skip penalty recalculation
}
```
Add this right after line 297-298 (`const isOverdue = ...`), before the
`if (isOverdue)` block at line 301. This ensures ALL four condition blocks
(lines 305-326, 378, 384-386, 392-399) correctly skip penalty logic.

**PEN-02 is NOT just a three-line change** — the guard must be placed where it
silences the entire penalty block.

### Pitfall 2.2: Read vs write race with cron job

**What goes wrong:** The `findUnique` call at line 272 reads the assignment
OUTSIDE the `$transaction`. Cron penalty (`applyOverduePenalty`) sets
`penaltyApplied=true` in a separate write (also outside transaction). Sequence:

1. Cron reads assignment: `penaltyApplied = false`
2. Completion handler reads assignment (line 272): `penaltyApplied = false`
3. Cron writes: updates user.points, sets penaltyApplied=true
4. Completion handler enters transaction: uses `penaltyApplied = false` from step 2
   → applies penalty AGAIN

**Severity:** LOW for SQLite single-writer. SQLite serializes writes, so step 3
must complete before step 4 begins. But the read at step 2 happened BEFORE step 3.
So the transaction sees stale data.

**Mitigation:** Move the `findUnique` INSIDE the `$transaction` callback, or
keep it outside but re-read `penaltyApplied` inside the transaction before
applying penalty logic. This is a more invasive change than the spec describes
but eliminates the race entirely.

**Practical risk:** Near-zero for single-user homelab. The window between
read (line 272) and transaction start (line 331) is microseconds. Document as
known limitation.

### Pitfall 2.3: Prisma already returns penaltyApplied — no schema change needed

**What goes wrong:** Developer assumes `penaltyApplied` isn't in the query result
because it's not in an explicit `select`. They add a `.select` or schema migration.
This would be wasted effort — Prisma's `include` returns ALL scalar fields.

**Prevention:** The `findUnique` at line 272 uses `include: { choreTemplate: true }`,
which returns ALL ChoreAssignment scalar fields including `penaltyApplied`.
No select/schema change needed. Verify by inspecting the assignment object:
`assignment.penaltyApplied` is already available.

### Pitfall 2.4: Tests don't exercise the penalty path

**What goes wrong:** The existing `completeAssignment` test (lines 315-376) uses
`mockPendingAssignment` which has `dueDate: tomorrow` and `penaltyApplied: false`.
The test never creates an overdue scenario where `penaltyApplied` is true. Adding
the guard creates a new code path that has ZERO test coverage.

**Prevention:** Add a new test case:
- Create an assignment with `dueDate: yesterday`, `penaltyApplied: true`
- Call `completeAssignment`
- Assert full template points awarded (no penalty deduction)
- Assert transaction type is 'EARNED'
- Assert `penaltyPoints` on the assignment is NOT overwritten

### Pitfall 2.5: Mock transaction doesn't return penaltyApplied

**What goes wrong:** The `$transaction` mock (test-helpers.ts line 32-50 / test
file lines 32-51) returns mock data for the choreAssignment.update call. If we
add assertions about `penaltyApplied` on the returned assignment, the mock
`mockAssignments.completed` has `penaltyApplied: false` but doesn't necessarily
reflect the actual update.

**Prevention:** After fix, the mock `$transaction` response should include
`penaltyApplied: true` for overdue scenarios where penalty was already applied.

---

## PEN-03: Change DEDUCTION to PENALTY string

**Location:** `backend/src/services/chore-assignments.service.ts` line 378

### Pitfall 3.1: Frontend type-specific rendering

**What goes wrong:** The change from `'DEDUCTION'` to `'PENALTY'` affects what
the frontend displays for late-completion transactions. If the frontend has
type-specific rendering (icons, labels, colors), 'PENALTY' might render
differently (or not at all).

**Check:** The `PointTransaction.type` field is a string. The frontend likely
maps these to display labels. If 'PENALTY' is missing from a display switch,
the transaction might show a blank or fallback label.

**Prevention:** Before deploying, check frontend rendering code for transaction
type handling. Search for `type === 'DEDUCTION'` and `type === 'PENALTY'` in
`frontend/src/`. Verify 'PENALTY' has a display label defined.

### Pitfall 3.2: No test coverage for transaction type

**What goes wrong:** The `completeAssignment` unit test (line 315-376) only
verifies that the function completes and `$transaction` is called. It doesn't
check the transaction type or amount. The integration test
(pocket-money.integration.test.ts line 292-343) checks "at least the template
points" but doesn't verify transaction type.

After the change, no existing test validates that 'PENALTY' is used instead of
'DEDUCTION'. The change could accidentally be reverted or never applied.

**Prevention:** Add an assertion in the unit test mock's `pointTransaction.create`
call to verify the type is 'PENALTY' for overdue-scenario completions.

### Pitfall 3.3: Existing DEDUCTION records remain 'DEDUCTION'

**What goes wrong:** The fix only affects NEW transactions. Any existing
DEDUCTION-type transactions from late completions will remain 'DEDUCTION' in
the database. The user will see a mix: old late-completions show as "Deduction",
new ones show as "Penalty".

**Severity:** LOW. Old transactions still display correctly (just as "Deduction"
instead of "Penalty"). No data is lost. No impact on balance calculations since
both types are handled identically in all calculation code.

**No migration needed** unless consistency is important for the family's audit trail.

---

## BAL-01: Fix ADJUSTMENT in balance calculation

**Location:** `backend/src/controllers/pocket-money.controller.ts`

### Pitfall 4.1: Incomplete fix — missing projectedEarnings (🔴 CRITICAL)

**What goes wrong:** CONCERNS.md identifies the bug in `calculatePointBalance`
(line 111) but NOT in `calculateProjectedEarnings` (line 790). The projected
earnings endpoint has the SAME pattern:
```typescript
} else if (['DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE', 'ADJUSTMENT'].includes(tx.type)) {
    periodEarnings -= Math.abs(tx.amount)
}
```

If only line 111 is fixed, the projected earnings page will still show incorrect
values for ADJUSTMENT transactions. Parents comparing balance vs projected will
see a discrepancy.

**Affected endpoints:**
- `GET /api/pocket-money/balance/:userId` → uses `calculatePointBalance` (FIXED)
- `GET /api/pocket-money/projected/:userId` → uses inline logic at line 790 (NOT FIXED)

**Prevention:** Fix BOTH locations: line 111 AND line 790. Remove 'ADJUSTMENT'
from the negative array in both places. Add it to the positive branch at line 789:
```typescript
if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
    periodEarnings += tx.amount
}
```

### Pitfall 4.2: Wrong fix form — don't remove, relocate

**What goes wrong:** Removing `'ADJUSTMENT'` from the `case` list at line 111
without adding it to the EARNED/BONUS case makes ADJUSTMENT a no-op —
its value is not counted in the balance at all. This is worse than the original
bug (which at least counted it, just in the wrong direction for positive values).

**Correct fix at line 103-113:**
```typescript
case 'EARNED':
case 'BONUS':
case 'ADJUSTMENT':  // MOVED HERE instead of deleted
    totalPoints += tx.amount
    break
case 'DEDUCTION':
case 'PENALTY':
case 'PAYOUT':
case 'ADVANCE':
    totalPoints -= Math.abs(tx.amount)
    break
```

**Correct fix at lines 787-792:**
```typescript
if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
    periodEarnings += tx.amount
} else if (['DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE'].includes(tx.type)) {
    periodEarnings -= Math.abs(tx.amount)
}
```

### Pitfall 4.3: Running balance code already handles ADJUSTMENT correctly

**What goes wrong:** Lines 396-401 and 435-441 (running balance in
getTransactionHistory) already handle ADJUSTMENT like EARNED/BONUS (positive
path). These locations do NOT need fixing.

**Risk:** Over-fixing by changing these locations too would make the running
balance inconsistent with the fixed `calculatePointBalance`.

**Prevention:** Only change lines 103-113 (calculatePointBalance) and lines
787-792 (calculateProjectedEarnings). Do NOT touch lines 396-401 or 435-441.

### Pitfall 4.4: Integration test gap

**What goes wrong:** The pocket-money integration tests
(pocket-money.integration.test.ts) don't test ADJUSTMENT transactions. They test
bonus and deduction but not manual adjustment. The fix could introduce a
regression (e.g., negative ADJUSTMENT now being counted as positive) without
any test catching it.

**Prevention:** Add an integration test that:
1. Creates a positive ADJUSTMENT → verify balance increases
2. Creates a negative ADJUSTMENT → verify balance decreases
3. Verify both methods (balance endpoint and transactions running balance) agree

### Pitfall 4.5: calculatePointBalance is called elsewhere

**What goes wrong:** `calculatePointBalance` is used by:
- `getPointBalance` (line 303)
- `addBonus` — NOT called directly, but `calculatePointBalance` is called internally
  Wait, actually `addBonus` doesn't call it.
- `addDeduction` (line 541) — checks `calculatePointBalance` before allowing deduction
- `addAdvance` (line 595) — checks `calculatePointBalance` before allowing advance
- `createPayout` (line 696) — checks `calculatePointBalance` before allowing payout

If `calculatePointBalance` is fixed to count ADJUSTMENT as positive (when amount
is positive), the `addDeduction` and `createPayout` balance checks might give
slightly different answers than before. This is CORRECT — previously they were
under-counting balance for users with positive ADJUSTMENT transactions. But it
changes behavior.

**Severity:** LOW. The balance check becomes more accurate, giving users MORE
available points than before (for positive ADJUSTMENT). No one is worse off.

---

## USR-01: Pass familyId through user creation

**Location:** Three files — `middleware/auth.ts`, `controllers/users.controller.ts`,
`services/users.service.ts`

### Pitfall 5.1: req.user type augmentation needed (🔴 CRITICAL)

**What goes wrong:** The `authenticate` middleware adds properties to `req.user`
(after line 59-66). The type `Request` likely has a user interface defined
somewhere (e.g., `Express.User` or a custom type). Adding `familyId` to the
select (line 35-42) and to `req.user` (line 59-66) will cause a TypeScript
error if the type doesn't include `familyId: string | null`.

**Check:** Search for `req.user` type definition. Likely in:
- `backend/src/types/express.d.ts` or
- `backend/src/@types/express/index.d.ts`

**Verdict:** Type update is REQUIRED for the compiler. This makes USR-01 slightly
larger than documented — it includes a type definition change.

### Pitfall 5.2: Controller must guard against null familyId

**What goes wrong:** The parent's `familyId` could theoretically be null (e.g.,
if the parent user record has `familyId: null`). Passing `null` to the service
would create a user with `familyId: null`, which defeats the purpose of the fix.

**The admin dashboard already guards this** (admin.controller.ts line 20-22):
```typescript
if (!user?.familyId) {
    throw new AppError('User does not belong to a family', 400, 'VALIDATION_ERROR')
}
```

**Prevention:** Add the same guard in `users.controller.ts` `createUser`:
```typescript
if (!req.user?.familyId) {
    throw new AppError('Your account is not associated with a family', 400, 'VALIDATION_ERROR')
}
```

### Pitfall 5.3: Unit test service mock breaks (🔴 TEST FAILURE)

**What goes wrong:** The `createUser` unit test in
`backend/src/__tests__/services/users.service.test.ts` (lines 293-365) does:

```typescript
expect(prisma.user.create).toHaveBeenCalledWith({
    data: {
        email: 'newuser@test.com',
        password: 'hashedpassword',
        name: 'New User',
        role: 'CHILD',
        color: '#FF0000',
        basePocketMoney: 5.0,
        // ❌ No familyId — this assertion will FAIL after fix
    },
    select: expect.objectContaining({...}),
})
```

After adding `familyId` to the service's data parameter, the create call will
include `familyId: 'family-123'` (passed from the controller). The test's
expectation doesn't include it → assertion fails.

**Affected test:** "should create a new user with all fields" (line 294-338)

**Also affected:** "should create user with default values" (line 341-365) —
same assertion pattern.

**Prevention:** Update BOTH test assertions to include `familyId` in the data
object. Also update the test call to `createUser` to include `familyId` in the
input.

### Pitfall 5.4: Controller unit test may need updating

**What goes wrong:** If there's a controller-level test for `createUser`, it
needs `req.user.familyId` to be set in the mock request.

**Check:** `backend/src/__tests__/controllers/users.controller.test.ts` — does it exist?

**Verdict:** If no controller test exists, no additional test work. The integration
test already creates users successfully and checks the response.

### Pitfall 5.5: Integration test passes but masks the fix

**What goes wrong:** The integration test `users.integration.test.ts` at line
239-257 creates a user and checks `email`, `name`, `role` but does NOT check
`familyId`. The test passes both before and after the fix, but doesn't verify
that `familyId` was actually propagated from parent to child.

**Prevention:** Add an assertion to the integration test that the created user's
`familyId` matches the parent's `familyId`:
```typescript
expect(response.body.data.user.familyId).toBe(testData.users.parent.familyId)
```

---

## UI-01: Wire NotifConfigCard to real data

**Location:** `frontend/src/pages/AdminPage.tsx` (line 16), `frontend/src/hooks/useAdmin.ts`

### Pitfall 6.1: Which user's notification settings to show?

**What goes wrong:** The admin dashboard shows a PARENT's dashboard. The
`NotifConfigCard` should display the **current admin user's** notification
settings, not a specific child's. The endpoint is
`GET /api/admin/users/:userId/notification-settings` which requires a userId.

The current admin's userId is available from the auth context (the logged-in
user). But the `useAdminDashboard` hook doesn't expose the current user's ID.

**Options:**
- Option A: Pass `userId` from the page component to the hook or direct fetch
- Option B: Add notification settings to the backend dashboard endpoint response
- Option C: Fetch in the component using a separate API call

**Risk with Option A:** The `useAdminDashboard` hook signature changes.
Existing consumers need updating.

**Risk with Option B:** Backend change required in `admin.service.ts` →
`getDashboard()` to include notification settings for the requesting user.
Requires controller to pass `userId`.

**Risk with Option C:** Simple but adds an extra API call on page load.
Loading state becomes more complex (dashboard loaded, but notifications loading).

### Pitfall 6.2: Separate loading and error states

**What goes wrong:** The current `NotifConfigCard` receives `loading` and
`error` from `useAdminDashboard`. If we fetch notification settings separately,
we need a new loading/error state. The card would show:
- Loading: Dashboard loaded, notifications loading — card shows spinner
- Dashboard loaded, notifications error — card shows error OR degrades to
  "No notification config"

**The simplest correct approach:** Fetch notification settings inside
`useAdminDashboard` alongside the dashboard data. Add a new endpoint call:
```typescript
const notifResponse = await apiClient.get<{ data: UserNotifSettings }>(
  `/admin/users/${currentUser.id}/notification-settings`
)
```

But this requires knowing `currentUser.id` inside the hook. Options:
- Pass it as a parameter to `useAdminDashboard(currentUserId)`
- Get it from the auth context

**Simplest safe fix using existing pattern:**
```typescript
// In AdminPage.tsx
const { user } = useAuth()
const { data, loading, error, refresh } = useAdminDashboard()
const { data: notifData } = useUserNotificationSettings(user?.id)

<NotifConfigCard data={notifData} loading={loading} error={error} />
```

Or even simpler — since the backend endpoint already exists, just fetch it directly:
```tsx
// AdminPage.tsx
const userId = getCurrentUserId() // from auth context
const notifUrl = `/admin/users/${userId}/notification-settings`
```

### Pitfall 6.3: Backend endpoint strips credentials — data shape matters

**What goes wrong:** The `getUserNotificationSettings` controller (line 43-55)
strips `ntfyPassword`, `ntfyUsername`, `emailNotifications`,
`notificationEmail` from the response. But the `NotifConfigCard` expects
specific fields in its `NotificationSettings` interface (lines 5-13):

```typescript
interface NotificationSettings {
    ntfyTopic: string | null
    ntfyServerUrl: string | null
    notifyChoreAssigned: boolean
    notifyChoreDueSoon: boolean
    notifyChoreCompleted: boolean
    notifyChoreOverdue: boolean
    notifyPointsEarned: boolean
    reminderHoursBefore: number
}
```

The endpoint response includes MORE fields than this (e.g., `quietHoursStart`,
`quietHoursEnd`, `overduePenaltyEnabled`, `overduePenaltyMultiplier`,
`notifyParentOnOverdue`). This is fine — extra fields are ignored. But the
`...safeSettings` spread includes everything except the 4 stripped fields,
which is a superset of what the card expects.

**Prevention:** The existing interface is a subset of the response. No data
shape changes needed. But check if the response wrapper matches: the endpoint
returns `{ success, data: { settings } }` but the card expects `data` directly
as `NotifConfigData` with a `.settings` property. The fetch response access
path must be `response.data.data.settings`.

### Pitfall 6.4: getOrCreateSettings always returns — no 404 to handle

**What goes wrong:** The `getUserNotificationSettings` endpoint calls
`getOrCreateSettings` which CREATES default settings if none exist. So the
endpoint NEVER returns 404. The NotifConfigCard's "No notification config"
empty state (line 58) will essentially never be shown.

**Prevention:** This is actually fine — the card will always show real data
after the fix. The empty state becomes dead code unless settings are explicitly
deleted (which the app doesn't support). Consider whether to keep the empty
state for defensive programming.

### Pitfall 6.5: E2E tests don't verify NotifConfigCard content

**What goes wrong:** The `admin.spec.ts` E2E test (line 25-30) only checks that
the admin page heading is visible — it doesn't verify any card content. The
NotifConfigCard rendering could be broken (wrong props, wrong URL, CORS issue)
without any E2E detection.

The test also creates a new parent user via the API, which might not have
notification settings configured (ntfyTopic = null). The card would show
"Not configured" for the ntfy channel, which is valid.

**Prevention:** At minimum, manually verify the card renders with real data
after the fix. Optionally add an E2E assertion for the card.

---

## INT-01: Fix all 5 point-mutation code paths

**Location:** `backend/src/controllers/pocket-money.controller.ts` — 4 endpoints
plus the overdue penalty (PEN-01 covered separately)

### Pitfall 7.1: No atomicity across user.points and PointTransaction (🔴 CRITICAL)

**What's the current state:**
| Endpoint | PointTransaction | user.points | Atomic? |
|----------|-----------------|-------------|---------|
| addBonus | ✓ (creates) | ✗ (missing) | N/A |
| addDeduction | ✓ (creates) | ✗ (missing) | N/A |
| addAdvance | ✓ (creates) | ✗ (missing) | N/A |
| createPayout | ✓ (creates) + Payout record | ✗ (missing) | N/A |
| completeAssignment | ✓ (creates) | ✓ (updates) | ✓ ($transaction) |
| applyOverduePenalty | ✗ (PEN-01) | ✓ (updates) | ✗ (no transaction) |

**What goes wrong if we just add `user.update` after `createTransaction`:**
- Step 1: `createTransaction` succeeds ✓
- Step 2: `user.update` FAILS (transient SQLite error, constraint violation) ✗
- Result: PointTransaction exists but user.points is unchanged
- Balance read from PointTransaction correctly reflects the change
- Balance read from user.points is stale

This creates divergence between the two representations. The `completeAssignment`
endpoint already handles this correctly with `prisma.$transaction`.

**The `addDeduction` and `createPayout` endpoints have an additional issue:**
they check `calculatePointBalance(userId)` before creating the transaction.
If we wrap the balance check AND the writes in a transaction, the balance check
reads the correct pre-mutation state. But the TOCTOU window (balance check
happens before the write) means between check and write, another operation
could change the balance. With SQLite's single-writer, this is theoretical but
worth noting.

**Prevention:** Use `prisma.$transaction` for ALL point-mutation operations:
```typescript
const result = await prisma.$transaction(async (tx) => {
    const txRecord = await tx.pointTransaction.create({...})
    await tx.user.update({ where: { id: userId }, data: { points: { increment: amount } } })
    return txRecord
})
```

This affects 4 endpoints. Skipping transactions is tech debt that will cause
data divergence under any error condition.

### Pitfall 7.2: Wrong sign for user.points increment per endpoint

**What goes wrong:** Each endpoint stores a different sign for the transaction. The
`user.points` increment must match:

| Endpoint | Transaction amount | user.points increment |
|----------|-------------------|----------------------|
| addBonus | `amount` (positive) | `{ increment: amount }` |
| addDeduction | `-amount` (negative) | `{ increment: -amount }` |
| addAdvance | `-amount` (negative) | `{ increment: -amount }` |
| createPayout | `-amount` (negative) or `-points` | `{ increment: -points }` |

For `addDeduction`: The `createTransaction` stores `-amount` (negative). The
user.points should also decrement by `amount`. So `{ increment: -amount }`.

For `createPayout`: The `createTransaction` stores `-points` (negative). The
user.points should decrement by `points`. So `{ increment: -points }`.

**Mixing up the sign** would double-count or negate the operation. E.g.,
incrementing by `+amount` for a deduction would add points instead of removing.

**Prevention:** Use a local variable for the delta and reuse it for both
the transaction creation and the user update:
```typescript
const delta = -amount  // for deduction
const tx = await tx.pointTransaction.create({ amount: delta, ... })
await tx.user.update({ data: { points: { increment: delta } } })
```

### Pitfall 7.3: createPayout does two writes + now needs three

**What goes wrong:** `createPayout` currently:
1. Creates `Payout` record
2. Creates `PointTransaction` (type PAYOUT)

After fix, it needs to ALSO:
3. Update `user.points`

That's THREE writes that should be atomic. The current code doesn't use
`$transaction`. Adding `user.update` without wrapping all three in a
transaction means if step 3 fails, we have a Payout record and PointTransaction
but user.points is inflated. This is the WORST outcome — the kid has been paid
out on paper but their user.points still reflect the pre-payout balance.

**Prevention:** Wrap all three writes in `prisma.$transaction`.

### Pitfall 7.4: addBonus and addDeduction check validate amount but not user existence

**What goes wrong:** Both `addBonus` and `addDeduction` already check user
existence. But they don't check if the user's `user.points` field would go
negative (for deduction). The `calculatePointBalance` check on line 541-543
prevents deducting more than the transactional balance, but `user.points` could
be lower (if divergence exists). After the fix, we need to ensure the deduction
doesn't make `user.points` negative — or decide that negative user.points is
acceptable (it's just a denormalized field, the source of truth is the
PointTransaction sum).

**Verdict:** Allow `user.points` to go negative. It's a denormalized cache.
The PointTransaction table is the source of truth. `user.points` = -50 is
meaningful if the kid has a -50 point balance.

### Pitfall 7.5: Integration test for bonus updates balance (E2E will pass)

**What goes wrong:** The E2E test `pocket-money.spec.ts` line 86-95:
```
// Add bonus → check balance increased by 50
```
This test calls `getUserBalance` which likely calls the balance endpoint, which
uses `calculatePointBalance` (sum of PointTransaction records). Adding
`user.points` update doesn't affect this test because the balance endpoint
reads from PointTransaction sum, not from `user.points`.

BUT — after the fix, the balance endpoint STILL reads from PointTransaction sum.
So the E2E test passes both before and after the fix. No regression detection.

**What about checking user.points directly?** The `user.points` field is used
elsewhere (e.g., admin dashboard, profile display). If the fix is wrong (e.g.,
wrong sign), the `user.points` field diverges but no test catches it.

**Prevention:** Add a test that directly verifies the `user.points` field after
each operation type. Use the Prisma client to read `user.points` directly, not
the balance endpoint (which reads from PointTransaction sum).

### Pitfall 7.6: Backward compatibility with existing diverged data

**What goes wrong:** Before the fix, user.points and PointTransaction sum have
already diverged for users who received bonus/deduction/advance/payout
transactions. After the fix, NEW operations keep them in sync, but the existing
gap persists.

Example: Alice has:
- 10 EARNED from chore (user.points = 10, PointTransaction sum = 10)
- parent adds BONUS of 50 → PointTransaction = 50, user.points still = 10
- After fix: NEW bonus of 30 → PointTransaction = 30, user.points = 40
- Total: PointTransaction sum = 90, user.points = 40

Alice sees 90 points (from transactions) but her profile shows 40.

**Prevention:** Run a one-time reconciliation as part of this milestone:
```sql
UPDATE "User" SET points = (
    SELECT COALESCE(SUM(
        CASE WHEN type IN ('EARNED', 'BONUS', 'ADJUSTMENT') THEN amount ELSE -ABS(amount) END
    ), 0)
    FROM "PointTransaction"
    WHERE "PointTransaction"."userId" = "User".id
);
```

Or document this as a known issue and run it at deploy time.

### Pitfall 7.7: Controller test heavy — 4 endpoints × mock updates

**What goes wrong:** If there are controller-level tests for each pocket-money
endpoint, each needs the Prisma mock to include both the existing
`pointTransaction.create` AND the new `user.update` call. If the mock
`$transaction` callback doesn't include `user.update`, tests fail.

**Existing mocks:** The `createPrismaMock()` in test-helpers.ts (line 353-457)
includes `user.update` and `pointTransaction.create` but as separate calls,
not inside a `$transaction`. If we move to `$transaction`, the mock needs the
transaction callback to include both operations.

**Verdict:** Check if controller-level tests exist. If not, the integration
tests cover the endpoints end-to-end.

**Correction:** There are unit tests that mock Prisma at the `__mocks__` level
(like `chore-assignments.service.test.ts` line 32-50). The pocket-money
controller is NOT tested with unit tests (it's tested via integration tests
only, which use a real SQLite database). So mock updates are only needed for
the service-level tests (PEN-01, PEN-02) and user service tests (USR-01).

### Pitfall 7.8: addBonus doesn't need balance check — but addDeduction does

**What goes wrong:** `addDeduction` (line 541-543) and `createPayout` (line
696-699) check `calculatePointBalance` before proceeding. If `user.points` is
diverged (see 7.6), the check against PointTransaction sum is correct — it
reflects actual balance. But if we DON'T reconcile first, `user.points` could
be very different from PointTransaction sum.

**Verdict:** The balance check uses PointTransaction sum (correct). The
`user.points` field is just a cache. No additional validation needed.

---

## Phase-Specific Warnings

| Fix Order | Likely Pitfall | Mitigation |
|-----------|---------------|------------|
| PEN-01 (first) | Missing mock for pointTransaction.create | Update `overdue-penalty.service.test.ts` mocks BEFORE running tests |
| PEN-01 (first) | Non-atomic writes in cron path | Wrap in `prisma.$transaction()` |
| PEN-02 (after PEN-01) | Guard placed on points deduction only, missing transaction type and description | Null out `penaltySettings` early, not just guard one condition |
| PEN-02 (after PEN-01) | No race-condition test with cron | Accept as low-risk; document known race |
| PEN-03 (smallest) | Frontend rendering missing 'PENALTY' type label | Check frontend transaction type switch statements |
| BAL-01 | Fixing only calculatePointBalance, not calculateProjectedEarnings | Fix BOTH locations |
| USR-01 | TypeScript compilation fails (req.user type) | Add familyId to Express.User type definition |
| USR-01 | Unit test assertion on createUser breaks | Update mock expectation to include familyId |
| UI-01 | Wrong user's notification settings displayed | Use current user ID from auth context |
| INT-01 (last) | Non-atomic writes across 4 endpoints | Wrap each in `prisma.$transaction()` |
| INT-01 (last) | Undetected sign error in user.points increment | Use shared `delta` variable, don't repeat sign logic |

---

## Sources

- Direct code analysis of all affected files (HIGH confidence)
- Prisma schema: `backend/prisma/schema.prisma`
- Unit tests: `backend/src/__tests__/services/*.test.ts`
- Integration tests: `backend/src/__tests__/integration/*.test.ts`
- E2E tests: `e2e/admin.spec.ts`, `e2e/pocket-money.spec.ts`, `e2e/p311-overdue-penalty.spec.ts`
