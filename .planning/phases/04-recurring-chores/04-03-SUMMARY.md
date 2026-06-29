# Plan 04-03: Merge Occurrences into Assignments — Summary

**Status:** Complete
**Completed:** 2026-06-28

## What was built

Modified `assignmentService.getAll()` to merge recurring occurrences with regular assignments:

- Imports `generateOccurrences` from `recurring.service`
- Calls lazy generation for current month (1st to last day) before querying
- Fetches both `choreAssignment` and `recurringOccurrence` in parallel (Promise.all)
- Normalizes both to a common shape with `type: 'REGULAR' | 'RECURRING'` discriminator
- Sorts merged array by `dueDate` ascending (string comparison since dates are YYYY-MM-DD)
- Role scoping applies to both: CHILD sees only their own, PARENT sees all

## Response shape (each item)

```typescript
{
  id: number
  type: 'REGULAR' | 'RECURRING'
  choreTemplateId: number
  assignedToId: number
  dueDate: string  // YYYY-MM-DD (normalized)
  status: 'PENDING' | 'COMPLETED'
  completedAt: string | null
  pointsAwarded: number | null
  notes: string | null
  createdAt: string
  template: { id, title, points, category }
  assignedTo: { id, name, color }
}
```

The `type` field is the discriminator. Frontend uses it to route completion to the correct endpoint (`/api/assignments/:id/complete` vs `/api/occurrences/:id/complete`).

## Verification

- `npx jest` — 101/101 tests pass (no regressions)
- `assignment.service.test.ts` — updated mocks to include `recurringChore` and `recurringOccurrence` on prisma; tests verify `type: 'REGULAR'` in mapped output

## Files modified

- `backend-v2/src/services/assignment.service.ts` — `getAll()` rewritten to call `generateOccurrences` and merge
- `backend-v2/src/__tests__/services/assignment.service.test.ts` — Updated mock + test data to use proper Date objects (service now calls `.toISOString()` on dates)

## Note on the `chore` field after deletion

The service's `.map()` filters out occurrences where `chore` is `null` (orphaned by SetNull after the parent RecurringChore was deleted). The type still discriminates them, but the include would be empty. This is acceptable — completed orphans still display with their snapshot `pointsAwarded` and the assignedTo data.

## Next

Plan 04-04: Frontend data layer (API + hook + page) for the parent to create/delete recurring chores
