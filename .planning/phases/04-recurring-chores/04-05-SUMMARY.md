# Plan 04-05: Wire Type Discriminator — Summary

**Status:** Complete
**Completed:** 2026-06-28

## What was built

Final wiring that makes recurring occurrences fully functional end-to-end:

### Assignment interface (`assignments.api.ts`)
- Added optional `type?: 'REGULAR' | 'RECURRING'` field
- Backward compatible — existing code that doesn't use the field still compiles

### Hook (`useAssignments.tsx`)
- Added second `useMutation` for `recurringApi.complete` (calls `/api/occurrences/:id/complete`)
- `completeAssignment(id, type?)` routes:
  - `type === 'RECURRING'` → `recurringApi.complete(id)`
  - otherwise → `assignmentsApi.complete(id)` (regular)
- `isCompleting` reflects OR of both mutation pending states
- Both mutations invalidate `['assignments']` on success

### Recurring API (`recurring.api.ts`)
- Added `complete(id)` function — POSTs to `/api/occurrences/:id/complete` (separate Axios instance, different base URL)
- Returns `RecurringOccurrence` type

### MyChoresPage
- `handleComplete(id, type?)` now takes type parameter
- Button onClick passes `assignment.type` so the right endpoint is called

### Tests
- `MyChoresPage.test.tsx`:
  - Updated existing test to verify `completeAssignment` is called with `(id, 'REGULAR')`
  - Added new test: completes a recurring occurrence — calls completeAssignment with `(99, 'RECURRING')`
  - Updated `defaultAssignment.dueDate` from '2026-05-15' to '2026-06-15' (current month)

- `AssignmentsPage.test.tsx`:
  - Updated `defaultAssignment.dueDate` from '2026-05-15' to '2026-06-15' (current month, was being filtered out)

## Verification

- `cd backend-v2 && npx jest` — 8 suites, 101/101 tests pass
- `cd frontend-v2 && npx vitest run` — 6 suites, 42/42 tests pass
- `cd frontend-v2 && npx tsc --noEmit` — No TypeScript errors
- All 143 tests pass across backend + frontend

## End-to-end flow

1. User opens MyChoresPage
2. Page calls `useAssignments()` → GET /api/assignments
3. Backend's `assignmentService.getAll()`:
   - Calls `generateOccurrences()` for current month
   - Fetches both ChoreAssignment and RecurringOccurrence rows
   - Merges with `type: 'REGULAR' | 'RECURRING'` discriminator
4. Page renders each item (no UI distinction — they look identical)
5. User clicks "Mark Complete" on a row
6. `handleComplete(id, type)` calls `completeAssignment(id, type)`
7. Hook routes:
   - `type === 'RECURRING'` → POST /api/occurrences/:id/complete
   - otherwise → POST /api/assignments/:id/complete
8. Backend service: ownership check + transaction (update + PointLog EARNED)
9. Frontend cache invalidates → refetch → row shows as completed

## Files modified

- `frontend-v2/src/api/assignments.api.ts` — Added `type` field
- `frontend-v2/src/api/recurring.api.ts` — Added `complete()` function
- `frontend-v2/src/hooks/useAssignments.tsx` — Type-routed completeAssignment
- `frontend-v2/src/pages/MyChoresPage.tsx` — Pass type to handleComplete
- `frontend-v2/src/__tests__/MyChoresPage.test.tsx` — Updated + new test
- `frontend-v2/src/__tests__/AssignmentsPage.test.tsx` — Updated dueDate

## Design decision: `as any` not used

The plan suggested `(assignment as any).type` to bypass TypeScript's strict checking. Instead, the implementation uses the properly-typed optional field `assignment.type`. This is cleaner and avoids type-system escape hatches.

## Next

Phase 4 complete. All 5 plans delivered:
- 04-01: Schema simplification ✓
- 04-02: Backend TDD service+routes ✓
- 04-03: Merge occurrences into assignments ✓
- 04-04: RecurringChoresPage ✓
- 04-05: Wire type discriminator ✓

Move to phase 5 (Points + Calendar).
