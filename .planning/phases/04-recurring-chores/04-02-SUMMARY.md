# Plan 04-02: Recurring Chore Backend — Summary

**Status:** Complete
**Completed:** 2026-06-28

## What was built

TDD implementation of the recurring chore backend:

### Service (`recurring.service.ts`)
- `create({ choreTemplateId, assignedToId, frequency, dayOfWeek?, dayOfMonth?, createdById })` — validates template exists (404), creates RecurringChore, returns with template + assignedTo includes
- `getAll()` — returns all recurring chores with template/assignee, ordered by createdAt desc
- `generateOccurrences(from, to)` — for each RecurringChore, computes expected dates based on frequency, queries existing occurrences, creates only missing ones. Idempotent via `@@unique` constraint.
- `completeOccurrence(occurrenceId, userId)` — owner check (403), already-completed check (409), transactional update + PointLog EARNED
- `delete_(id)` — deletes PENDING occurrences first, then RecurringChore in a transaction. COMPLETED occurrences survive (recurringChoreId set to null via SetNull)

### Routes (`recurring.routes.ts`)
- `POST /` — `authenticate` + `authorize('PARENT')`, body validated
- `GET /` — `authenticate`, any role
- `DELETE /:id` — `authenticate` + `authorize('PARENT')`

### Routes (`occurrences.routes.ts`)
- `POST /:id/complete` — `authenticate` only, ownership enforced in service

### Schema
- `RecurringOccurrence.recurringChoreId` is now `Int?` (nullable)
- `onDelete: SetNull` on the relation (replaces the original `Cascade` removed in 04-01)
- This preserves completed occurrences for history when the parent RecurringChore is deleted

### Routes mount (`routes/index.ts`)
- `router.use('/recurring', recurringRouter)`
- `router.use('/occurrences', occurrencesRouter)`

## Verification

- **RED:** 14 failing tests in `recurring.service.test.ts` (initially — service didn't exist)
- **GREEN:** 14/14 service unit tests pass + 10/10 route integration tests pass
- **No regressions:** All 8 pre-existing test suites (74 tests) still pass
- **Total backend:** 8 suites, 101 tests, all passing

## Files modified

- `backend-v2/src/services/recurring.service.ts` — Service (164 lines)
- `backend-v2/src/routes/recurring.routes.ts` — Routes (39 lines)
- `backend-v2/src/routes/occurrences.routes.ts` — Occurrence complete route (17 lines)
- `backend-v2/src/routes/index.ts` — Mount routers
- `backend-v2/prisma/schema.prisma` — SetNull + nullable recurringChoreId
- `backend-v2/src/__tests__/services/recurring.service.test.ts` — 14 unit tests
- `backend-v2/src/__tests__/recurring.test.ts` — 10 integration tests

## Design decisions made during GREEN

- **`createMany` + `skipDuplicates`** not supported by SQLite Prisma driver — removed the option. The `@@unique` constraint provides DB-level guarantee against duplicates.
- **Date math** uses UTC consistently: `toISOString().slice(0, 10)` for comparison, `getUTCDay()` / `getUTCDate()` for extraction. Avoids timezone drift in the lazy generation loop.
- **Monthly clamping** is per-iteration: `Math.min(target, lastDayOfMonth)` evaluated against the actual month being generated, not the target month. This correctly clamps `dayOfMonth=31` to Feb 28/29.

## Next

Plan 04-03: Merge occurrences into `GET /api/assignments` response with `type` discriminator
