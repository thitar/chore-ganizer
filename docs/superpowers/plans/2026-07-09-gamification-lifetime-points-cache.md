# Gamification `lifetimePoints` Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache `lifetimePoints` on `User` (mirroring the existing `streakCount`/`streakComputedAt` pattern exactly) so `getGamification` and `evaluateBadges` stop each independently running a `pointLog.aggregate()` scan, without a separate data-migration/backfill script and without risking a single incorrect value for any existing user.

**Architecture:** This is the fix that was explicitly deferred twice (PR #146 review round 3, and again in `fix/m2-followups` — see `docs/project_notes/issues.md`, 2026-07-09 entries) because it seemed to require a schema migration + backfill against live production data, and this project has no migration tooling (`prisma db push` only, no `prisma migrate`). **The blocker dissolves once the cache uses the same lazy self-healing pattern `streakCount`/`streakComputedAt` already uses**: add a nullable `lifetimePointsSyncedAt` sentinel alongside the cached value. On any read, if the sentinel is null (true for every existing user immediately after the schema push, since the column is new), recompute the true value via the existing aggregate query and write it back — this *is* the backfill, running automatically and correctly on first read, no separate script needed. From then on, every write path that creates a positive-amount `PointLog` also increments the cached column in the same transaction, so subsequent reads are O(1) instead of O(history).

**Tech Stack:** Prisma/SQLite (`prisma db push`, additive column with default — safe, non-destructive), Jest (backend tests, prisma mocked).

## Global Constraints

- This plan changes application data-correctness behavior, not just performance — every step that touches `getLifetimePoints`'s return value must be verified against the *exact* old aggregate-based result before being trusted, not just "it runs without error."
- `prisma db push` is additive here (new nullable/defaulted columns) — safe against the live database. Still: run this against the production `DATA_DIR` database (or a copy of it) at least once in Task 5 before considering the plan done, not only against a fresh seeded test DB — a fresh DB has no pre-existing `PointLog` history to validate the backfill path against.
- Work on branch `fix/gamification-lifetime-points-cache`.
- TDD: write the failing test, watch it fail, implement, watch it pass — per file.
- One commit per task.

---

## Task 1: Schema — add the cache columns

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `User.lifetimePoints: Int` (default 0), `User.lifetimePointsSyncedAt: DateTime?` — later tasks read/write these exact field names.

- [ ] **Step 1: Add the fields**

In `backend/prisma/schema.prisma`, inside `model User`, immediately after the existing `streakComputedAt DateTime?` line:

```prisma
  streakCount            Int       @default(0)
  streakComputedAt       DateTime?
  lifetimePoints         Int       @default(0)
  lifetimePointsSyncedAt DateTime?
```

(Adjust alignment of the surrounding fields' types if Prisma's formatter reflows the column — run `npx prisma format` after editing, don't hand-align.)

- [ ] **Step 2: Validate and regenerate the client**

```bash
cd backend && npx prisma validate && npx prisma generate
```
Expected: `The schema at prisma/schema.prisma is valid`, then client generation succeeds.

- [ ] **Step 3: Push to the local dev database and verify existing tests still pass**

```bash
npx prisma db push
npm test
```
Expected: schema push succeeds (additive column, existing rows get `lifetimePoints=0`, `lifetimePointsSyncedAt=NULL` — this is fine, Task 2's backfill-on-read handles it). All existing tests still pass (they mock Prisma, so the new columns don't affect them yet).

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(gamification): add User.lifetimePoints cache columns

Additive schema change (new nullable/defaulted columns) — safe against
the live database via prisma db push. lifetimePointsSyncedAt starts
NULL for all existing users; Task 2's getLifetimePoints rewrite treats
NULL as 'never synced' and backfills from the real PointLog history on
first read, so no separate migration/backfill script is needed."
```

---

## Task 2: Rewrite `getLifetimePoints` as a lazy self-healing cache

**Files:**
- Modify: `backend/src/services/gamification.service.ts:32-38`
- Test: `backend/src/__tests__/services/gamification.service.test.ts`

**Interfaces:**
- Consumes: `User.lifetimePoints`, `User.lifetimePointsSyncedAt` from Task 1.
- Produces: `getLifetimePoints(userId: number): Promise<number>` — same signature as before, callers (`collectStats`, `getGamification`) need no changes.

- [ ] **Step 1: Write the failing tests**

Find the existing `describe('getLifetimePoints', ...)` block in `backend/src/__tests__/services/gamification.service.test.ts` (currently tests the aggregate-only behavior) and replace it with:

```typescript
describe('getLifetimePoints (cache)', () => {
  it('backfills from the real aggregate when never synced (lifetimePointsSyncedAt is null)', async () => {
    prisma.user.findUnique.mockResolvedValue({ lifetimePoints: 0, lifetimePointsSyncedAt: null })
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 340 } })
    prisma.user.update.mockResolvedValue({})

    const total = await gamification.getLifetimePoints(3)

    expect(total).toBe(340)
    expect(prisma.pointLog.aggregate).toHaveBeenCalledWith({
      where: { userId: 3, amount: { gt: 0 } },
      _sum: { amount: true },
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { lifetimePoints: 340, lifetimePointsSyncedAt: expect.any(Date) },
    })
  })

  it('backfills to 0 when never synced and there is no positive history', async () => {
    prisma.user.findUnique.mockResolvedValue({ lifetimePoints: 0, lifetimePointsSyncedAt: null })
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.user.update.mockResolvedValue({})

    expect(await gamification.getLifetimePoints(3)).toBe(0)
  })

  it('returns the cached value without querying pointLog when already synced', async () => {
    prisma.user.findUnique.mockResolvedValue({ lifetimePoints: 340, lifetimePointsSyncedAt: new Date() })

    const total = await gamification.getLifetimePoints(3)

    expect(total).toBe(340)
    expect(prisma.pointLog.aggregate).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 0 for a user that does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    expect(await gamification.getLifetimePoints(999)).toBe(0)
    expect(prisma.pointLog.aggregate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail**

```bash
npm test -- gamification.service.test.ts
```
Expected: FAIL — the current implementation always calls `pointLog.aggregate` and never touches `prisma.user.findUnique`/`update`, so the "returns cached value without querying" and "returns 0 for nonexistent user without querying" assertions fail.

- [ ] **Step 3: Implement**

Replace `getLifetimePoints` in `backend/src/services/gamification.service.ts:32-38`:

```typescript
export async function getLifetimePoints(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifetimePoints: true, lifetimePointsSyncedAt: true },
  })
  if (!user) return 0
  if (user.lifetimePointsSyncedAt !== null) {
    return user.lifetimePoints
  }
  const aggregate = await prisma.pointLog.aggregate({
    where: { userId, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const total = aggregate._sum.amount ?? 0
  await prisma.user.update({
    where: { id: userId },
    data: { lifetimePoints: total, lifetimePointsSyncedAt: new Date() },
  })
  return total
}
```

Note this deliberately never re-syncs once `lifetimePointsSyncedAt` is set (unlike `getStreak`, which re-syncs weekly) — `lifetimePoints` has no natural staleness window; it's kept accurate going forward entirely by Task 3's write-path increments, not by periodic recomputation.

- [ ] **Step 4: Run to verify the tests pass**

```bash
npm test -- gamification.service.test.ts
```
Expected: PASS. Note: other tests in this file that call `evaluateBadges`/`collectStats`/`getGamification` and previously mocked only `prisma.pointLog.aggregate` for lifetime points will now also need `prisma.user.findUnique` to return a `lifetimePointsSyncedAt` — check each failure individually rather than blanket-guessing; most already mock `prisma.user.findUnique` for `getStreak`'s sake, so extend those same mock objects with `lifetimePoints`/`lifetimePointsSyncedAt` fields rather than adding new separate mocks.

- [ ] **Step 5: Fix any newly-broken tests from Step 4**

For each failure, add `lifetimePoints`/`lifetimePointsSyncedAt` to the existing `prisma.user.findUnique.mockResolvedValue({...})` call in that test (both `getStreak` and `getLifetimePoints` now read from the same `user.findUnique` shape conceptually, though via separate calls — mock whichever call each test actually exercises).

- [ ] **Step 6: Run the full gamification test file**

```bash
npm test -- gamification.service.test.ts
```
Expected: all tests pass (should be ~31: 27 pre-existing minus the 2 replaced + 4 new... verify exact count by reading the file, don't guess).

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/gamification.service.ts backend/src/__tests__/services/gamification.service.test.ts
git commit -m "feat(gamification): getLifetimePoints reads from cache, self-heals on first read

Mirrors getStreak's lazy-cache pattern. Unlike streak (which re-syncs
weekly), lifetimePoints never needs periodic recomputation — it's kept
accurate going forward by the write-path increments in the next task.
The self-heal-on-first-read behavior IS the backfill: no separate
migration script needed, existing users get the correct value the
first time anything reads their gamification state after this ships."
```

---

## Task 3: Increment the cache at every positive-`PointLog` write site

**Files:**
- Modify: `backend/src/services/assignment.service.ts:144-179` (`complete`)
- Modify: `backend/src/services/recurring.service.ts:108-153` (`completeOccurrence`)
- Modify: `backend/src/services/points.service.ts:41-66` (`adjustPoints`)
- Test: `backend/src/__tests__/services/assignment.service.test.ts`, `backend/src/__tests__/services/recurring.service.test.ts`, `backend/src/__tests__/services/points.service.test.ts` (or wherever `points.service`'s tests live — confirm exact path via `find backend/src/__tests__ -iname "*points*"` before writing)

**Interfaces:**
- Consumes: Task 2's cache columns.
- Produces: no new exported functions — same public signatures, just an added side effect inside each existing transaction.

**Do NOT increment on the `uncomplete` / `REVERSED` path.** `lifetimePoints` is a permanent achievement counter by design (badges are never revoked when a chore is uncompleted — this matches `getLifetimePoints`'s pre-existing `amount: { gt: 0 }` filter, which already excluded negative `REVERSED` entries from the old aggregate). Confirm `backend/src/services/assignment.service.ts`'s `uncomplete` function is NOT touched by this task.

- [ ] **Step 1: Write the failing test for `assignment.service.complete`**

In `backend/src/__tests__/services/assignment.service.test.ts`, find the existing test(s) covering `complete()` and add:

```typescript
it('increments the assignee lifetimePoints cache in the same transaction', async () => {
  // Follow this file's existing mock setup for complete() — assignment
  // found, template with points, prisma.$transaction mocked to invoke
  // the callback with a tx object whose methods are jest.fn()s.
  // Add this assertion alongside the existing ones for this test:
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: assignment.assignedToId },
    data: { lifetimePoints: { increment: pointsAwarded } },
  })
})
```

(Write this using the exact mock/tx setup pattern already present in this file's `complete()` tests — don't invent a new mocking style. Read the existing test immediately above the insertion point first.)

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- assignment.service.test.ts
```
Expected: FAIL — `tx.user.update` was never called.

- [ ] **Step 3: Implement in `assignment.service.ts`**

In the `$transaction` callback inside `complete()` (`backend/src/services/assignment.service.ts:155-175`), after the `tx.pointLog.create(...)` call and before the `return tx.choreAssignment.findUnique(...)`:

```typescript
    if (pointsAwarded > 0) {
      await tx.user.update({
        where: { id: assignment.assignedToId },
        data: { lifetimePoints: { increment: pointsAwarded } },
      })
    }
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- assignment.service.test.ts
```
Expected: PASS.

- [ ] **Step 5: Repeat Steps 1-4 for `recurring.service.completeOccurrence`**

Same pattern in `backend/src/services/recurring.service.ts`'s `$transaction` callback (currently lines 127-151), after `tx.pointLog.create(...)`:

```typescript
    if (pointsAwarded > 0) {
      await tx.user.update({
        where: { id: occurrence.assignedToId },
        data: { lifetimePoints: { increment: pointsAwarded } },
      })
    }
```

Test file: `backend/src/__tests__/services/recurring.service.test.ts`, following the same existing-mock-pattern approach as Step 1.

- [ ] **Step 6: Repeat for `points.service.adjustPoints` — this one needs a transaction wrapper it doesn't currently have**

`backend/src/services/points.service.ts:58-65` currently does a bare `prisma.pointLog.create(...)`, not wrapped in `$transaction`. Find its test file first (`find backend/src/__tests__ -iname "*points*"`) and check how `prisma.$transaction` is or isn't currently mocked there before writing the new test, then add:

```typescript
it('increments lifetimePoints when the adjustment amount is positive', async () => {
  // mock prisma.$transaction to invoke its callback with a tx object
  // mock tx.pointLog.create to resolve with a log row
  // mock tx.user.update
  await pointsService.adjustPoints(5, 20, 'Bonus for extra effort')
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: 5 },
    data: { lifetimePoints: { increment: 20 } },
  })
})

it('does not increment lifetimePoints when the adjustment amount is negative', async () => {
  await pointsService.adjustPoints(5, -10, 'Deduction')
  expect(tx.user.update).not.toHaveBeenCalled()
})
```

Run to verify both fail, then implement:

```typescript
export async function adjustPoints(userId: number, amount: number, reason: string) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new AppError('Amount must be a non-zero integer', 400)
  }
  if (!reason || reason.trim().length === 0) {
    throw new AppError('Reason is required', 400)
  }
  if (reason.length > 200) {
    throw new AppError('Reason must be 200 characters or fewer', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) throw new AppError('User not found', 404)

  return prisma.$transaction(async (tx) => {
    const log = await tx.pointLog.create({
      data: {
        userId,
        amount,
        type: 'ADJUSTMENT',
        reason: reason.trim(),
      },
    })
    if (amount > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { lifetimePoints: { increment: amount } },
      })
    }
    return log
  })
}
```

Run to verify both pass.

- [ ] **Step 7: Run the full backend suite**

```bash
npm test
```
Expected: all pass, including every file touched above plus everything downstream (`points.routes.ts` tests, etc.).

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/assignment.service.ts backend/src/services/recurring.service.ts backend/src/services/points.service.ts backend/src/__tests__/services/assignment.service.test.ts backend/src/__tests__/services/recurring.service.test.ts backend/src/__tests__/services/points.service.test.ts
git commit -m "feat(gamification): increment lifetimePoints cache at every positive PointLog write

assignment.service.complete, recurring.service.completeOccurrence, and
points.service.adjustPoints (newly transaction-wrapped for atomicity)
now increment User.lifetimePoints in the same transaction as the
PointLog they create, whenever the amount is positive. Negative
entries (REVERSED from uncomplete, negative ADJUSTMENT) are
deliberately excluded — lifetimePoints is a permanent achievement
counter, matching the pre-existing amount>0 filter semantics and the
'badges are never revoked' design decision."
```

---

## Task 4: Verify no read-path behavior changed

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm `evaluateBadges`/`collectStats` and `getGamification` need no code changes**

Both already call `getLifetimePoints(userId)` (Task 2 changed its internals, not its signature or return semantics). Run:

```bash
grep -n "getLifetimePoints(" backend/src/services/gamification.service.ts
```
Expected: two call sites (`collectStats`, `getGamification`), both unchanged by this plan.

- [ ] **Step 2: Run the full backend and frontend suites one more time**

```bash
(cd backend && npm test && npx tsc --noEmit)
(cd frontend && npm test -- --run && npx tsc --noEmit && npm run build)
```
Expected: all green.

---

## Task 5: Verify backfill correctness against real data (not just mocks)

**Files:** none modified — this is the task that justifies the plan's core safety claim.

- [ ] **Step 1: Set up an isolated DB seeded with realistic history**

Follow the isolated-instance pattern from `docs/superpowers/plans/2026-07-09-uat-plan.md` Task 1 Step 1 (separate `DATABASE_URL`, seeded via `npx prisma db seed`), but additionally complete several chores and run a couple of `adjustPoints` calls through the running app first, so there's real `PointLog` history — **do this on a copy of the schema from before Task 1's migration** (i.e., check out `main` in a scratch clone, seed and generate history there, then apply Task 1's `prisma db push` on top of that already-populated database) so the test genuinely exercises "existing user, pre-existing history, column just added" rather than "fresh user, no history."

- [ ] **Step 2: Compute the expected value independently**

Before triggering any code that reads `getLifetimePoints`, compute the true expected value directly:

```bash
sqlite3 $DATABASE_PATH "SELECT SUM(amount) FROM PointLog WHERE userId = <id> AND amount > 0;"
```

- [ ] **Step 3: Trigger the backfill and compare**

Hit `GET /api/points/gamification` for that user (first read after the schema push — `lifetimePointsSyncedAt` is still NULL at this point) and confirm the returned `level.lifetimePoints` matches Step 2's value exactly.

```bash
sqlite3 $DATABASE_PATH "SELECT lifetimePoints, lifetimePointsSyncedAt FROM User WHERE id = <id>;"
```
Expected: `lifetimePoints` matches Step 2's sum, `lifetimePointsSyncedAt` is now set (non-null).

- [ ] **Step 4: Confirm the cache is now used, not recomputed**

Complete one more chore for that user through the running app, then re-check:
```bash
sqlite3 $DATABASE_PATH "SELECT lifetimePoints FROM User WHERE id = <id>;"
```
Expected: increased by exactly that chore's point value (proves Task 3's increment fired, not a fresh aggregate recompute masking a bug).

- [ ] **Step 5: Clean up**

Tear down the scratch DB and any running dev servers spun up for this task; confirm `git status` is clean (no stray `vite.config.ts` proxy edits left uncommitted, matching the cleanup discipline used in prior verification passes this session).

---

## Task 6: Push and open PR

- [ ] **Step 1: Final full verification sweep**

```bash
(cd backend && npm test && npx tsc --noEmit)
(cd frontend && npm test -- --run && npx tsc --noEmit && npm run build)
```

- [ ] **Step 2: Update `docs/project_notes/issues.md`**

Add an entry closing out the deferred item from the 2026-07-09 "PR #146 third review" and "Chased the three items..." entries — this was the one piece explicitly left open in both.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin fix/gamification-lifetime-points-cache
gh pr create --base main --title "feat(gamification): cache lifetimePoints on User, close out the deferred perf item" --body "$(cat <<'EOF'
## Summary
Closes the gamification read-path duplication deferred twice (PR #146 review round 3, and again in fix/m2-followups — see docs/project_notes/issues.md).

Caches lifetimePoints on User, mirroring the existing streakCount/streakComputedAt pattern exactly. The original blocker was "needs a migration + backfill, and this project has no migration tooling" — resolved by using the same lazy self-healing design streaks already use: a nullable lifetimePointsSyncedAt sentinel means the backfill runs automatically and correctly on first read after the schema push, no separate script needed. Write paths (chore completion x2, points adjustment) increment the cache in the same transaction as the PointLog they create; negative entries (uncomplete, negative adjustments) are deliberately excluded, matching the existing amount>0 filter semantics and the "badges never revoked" design decision.

## Test plan
- [x] Backend unit tests cover: cache hit, cache miss (backfill), nonexistent user, all three write-site increments (positive and negative amount cases)
- [x] Verified against real pre-existing PointLog history in an isolated DB (not just mocks) — backfilled value matched an independently-computed SQL sum exactly, and the cache was confirmed to be used (not recomputed) on the next read
EOF
)"
```

---

## Explicitly out of scope for this plan

- Caching `streakCount`'s underlying scan further (already cache-protected weekly; not part of this deferred item).
- Any change to badge-earning rules or thresholds.
- Backfilling via a standalone script — deliberately avoided in favor of the self-healing read-path design described above.
