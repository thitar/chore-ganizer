# Plan 04-01: Simplify Prisma Schema — Summary

**Status:** Complete
**Completed:** 2026-06-28

## What was built

Simplified the Prisma schema for recurring chores:

- Dropped `RecurringChoreAssignee` many-to-many table (RECUR-05 mandates single fixed assignee)
- Added `assignedToId Int` to `RecurringChore` with `assignedTo` User relation
- Added `pointsAwarded Int?` to `RecurringOccurrence` (snapshot of template points at completion)
- Removed `onDelete: Cascade` from `RecurringOccurrence`→`RecurringChore` (service will handle deletion)
- Updated `User` model: removed `recurringAssignees` field, added `assignedRecurringChores` with named relation
- Added 2 recurring chores to seed: Alice's daily "Make Bed" (5 pts), Bob's weekly "Take Out Trash" on Mondays (10 pts)

## Verification

- `npx prisma generate` — succeeded
- `npx prisma db push --accept-data-loss` — applied schema
- `npx prisma db seed` — "Seed complete: 4 users, 4 chore templates, 2 point logs, 2 recurring chores"
- `npx jest` — 74 tests pass (no regressions)

## Files modified

- `backend-v2/prisma/schema.prisma` — Schema simplification
- `backend-v2/prisma/seed.ts` — Added recurring chore seed data

## Next

Plan 04-02: Recurring chore backend service + routes (TDD)
