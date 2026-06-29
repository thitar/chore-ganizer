# Plan 04-04: RecurringChoresPage — Summary

**Status:** Complete
**Completed:** 2026-06-28

## What was built

### API client (`recurring.api.ts`)
- Axios instance at `/api/recurring` and `/api/occurrences` (for complete)
- `RecurringChore` and `RecurringOccurrence` interfaces
- `getAll()`, `create()` with D-17 mapping (`templateId → choreTemplateId`, `userId → assignedToId`), `delete_()`, `complete()`

### Hook (`useRecurringChores.tsx`)
- React Query for `['recurring-chores']`
- `createRecurringChore`, `deleteRecurringChore` mutations
- Both invalidate `['recurring-chores']` AND `['assignments']` on success (occurrences depend on recurring chore definitions)
- `isCreating`, `isDeleting` loading states

### Page (`RecurringChoresPage.tsx`)
- 4-column grid list: Template, Frequency, Assignee, Actions
- Create form: Template select (from existing ChoreTemplates), Frequency select, conditional Day of Week (WEEKLY) or Day of Month (MONTHLY) field, Assigned To select (CHILD users only)
- Frequency display formats: "Daily", "Weekly (Monday)", "Monthly (day 15)"
- Empty state with "Create Recurring Chore" CTA
- Loading + error states with retry
- Delete confirmation via ConfirmDelete component
- Success toast (auto-dismisses after 3s)

### NavBar update
- Added "Recurring" link between "Templates" and "Assignments", gated on `user?.role === 'PARENT'`

### App.tsx route
- `/recurring-chores` route with `ProtectedRoute requiredRole="PARENT"`

### Tests (`RecurringChoresPage.test.tsx`)
- 10 test cases covering loading, empty, populated, create form, conditional dayOfWeek/dayOfMonth, submission, delete confirmation, error state

## Verification

- `npx vitest run` — 42/42 frontend tests pass
- `npx tsc --noEmit` — No TypeScript errors
- `npx vitest run src/__tests__/RecurringChoresPage.test.tsx` — 10/10 pass

## Files modified

- `frontend-v2/src/api/recurring.api.ts` — Created
- `frontend-v2/src/hooks/useRecurringChores.tsx` — Created
- `frontend-v2/src/pages/RecurringChoresPage.tsx` — Created (272 lines)
- `frontend-v2/src/components/NavBar.tsx` — Added Recurring link
- `frontend-v2/src/App.tsx` — Added `/recurring-chores` route
- `frontend-v2/src/__tests__/RecurringChoresPage.test.tsx` — Created
- `frontend-v2/src/test/setup.ts` — Copied from main repo (was missing in worktree)

## Design decisions

- **Form pattern follows TemplatesPage** — same form card, validation pattern, success toast mechanism
- **Conditional day field** is rendered inline (not a separate wizard) — matches Phase 3's "form per page" pattern
- **CHILD-only assignee dropdown** — parents can't accidentally assign a recurring chore to themselves
- **Frequency display** uses the WEEKDAY_LABELS constant to convert dayOfWeek integer (0-6) to readable day name
- **Color dot** in assignee column matches the existing AssignmentsPage convention

## Next

Plan 04-05: Wire type discriminator through completion flow so MyChoresPage routes correctly
