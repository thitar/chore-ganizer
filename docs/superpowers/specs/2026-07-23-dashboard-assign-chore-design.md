# Dashboard "Assign Chore" Quick Action Design

**Date:** 2026-07-23
**Status:** Approved for planning

## Goal

The only way to assign a chore today is to navigate to the Assignments page and use its "Assign Chore" button. Parents want this action reachable directly from the main dashboard, since that's the page they land on and check most often, including on mobile.

## Scope

1. Extract the existing inline assignment form on `AssignmentsPage.tsx` into a standalone, reusable `AssignChoreForm` component, used by both `AssignmentsPage` and the new dashboard entry point — no duplicated template/child/date fields or submit logic.
2. Add a generic `Modal` UI primitive (none exists in `frontend/src/components/ui/` today), built on the native `<dialog>` element.
3. Add a parent-only, full-width "Assign Chore" button to `DashboardPage.tsx`, directly below the greeting, that opens `AssignChoreForm` inside the new `Modal`.
4. Preserve `AssignmentsPage`'s current inline-expand visual behavior and all of its existing test assertions — this is a refactor of that page's form, not a UX change to it.

## Non-Goals

- No changes to the assignment API, Zod schemas, or backend.
- No new dependency (e.g. Radix/Headless UI) for the modal — native `<dialog>` covers focus-trapping, ESC-to-close, and backdrop styling without one, matching this project's existing pattern of avoiding libraries where a native/lightweight option exists (no framer-motion, native `fetch` over the `ntfy` npm package — see `docs/project_notes/decisions.md`).
- No child-facing changes. The button and modal render only when `user?.role === 'PARENT'`, matching the existing role-check pattern in `TopNav.tsx`/`PointsPage.tsx`.
- No changes to what the dashboard's "Upcoming Chores" list shows (it stays filtered to the logged-in user's own assignments; a parent assigning a chore to a child does not add anything to the parent's own upcoming list).

## Components

### `frontend/src/components/ui/Modal.tsx` (new)

A small, generic modal primitive, not assignment-specific — available for future modal needs too.

- Props: `open: boolean`, `onClose: () => void`, `title?: string`, `children: React.ReactNode`.
- Wraps a `<dialog>` element. A `ref` + `useEffect` calls `.showModal()` when `open` becomes `true` and `.close()` when it becomes `false`.
- Native ESC handling closes the dialog; the component listens for the dialog's `close` event and calls `onClose` so parent state stays in sync.
- Backdrop-click-to-close: a click handler on the `<dialog>` element itself checks whether the click target is the dialog (not its content) and calls `onClose` if so — native `<dialog>` doesn't provide this for free.
- Styles the `::backdrop` pseudo-element to match the existing dark theme (semi-transparent scrim consistent with other overlay-style UI in the app).

### `frontend/src/components/AssignChoreForm.tsx` (new, extracted)

Moves the form currently inline in `AssignmentsPage.tsx` (template select, "Assign To" select limited to `role === 'CHILD'` users, due-date input, submit/cancel buttons, inline `formError` alert) into its own component.

- Props: `mode: 'create' | 'edit'`, `assignment?: Assignment` (prefills fields when editing), `onSuccess: (message: string) => void`, `onCancel: () => void`.
- Self-contained: calls `useAssignments()`, `useTemplates()`, `useUsers()` internally — callers don't prop-drill mutation functions or data.
- Preserves existing field labels/markup exactly (`Template`, `Assign To`, `Due Date`, `Assign Chore`/`Save Assignment`/`Discard changes` button text) so `AssignmentsPage.test.tsx`'s existing `getByLabelText`/`getByText` assertions keep passing unchanged.
- On successful create/update, calls `onSuccess(message)` with the same copy used today (`'Assignment created!'` / `'Assignment updated!'`). On failure, sets its own inline `formError` and stays open — same recovery behavior as today.
- Calls `onCancel()` when the Discard/Cancel button is clicked.

### `AssignmentsPage.tsx` (changed)

Replaces its inline form JSX and local form state (`selectedTemplateId`, `selectedUserId`, `dueDate`, `formError`, `resetForm`, `handleSubmit`) with:

```tsx
<AssignChoreForm
  mode={editingAssignment ? 'edit' : 'create'}
  assignment={editingAssignment ?? undefined}
  onSuccess={msg => { setSuccessMessage(msg); cancelForm() }}
  onCancel={cancelForm}
/>
```

Still rendered inside the same bordered container div, in the same inline-expand position, driven by the same `showForm`/`editingAssignment` state the page already has. No visual or behavioral change to this page.

### `DashboardPage.tsx` (changed)

For `user?.role === 'PARENT'` only:

- The greeting row becomes its own line (`Hey {name} 👋`), followed by a full-width `Assign Chore` button on its own row directly beneath it — full-width and directly below so it's unmissable on mobile without scrolling or relying on a cramped inline row.
- Clicking the button sets `showAssignModal = true`.
- `<Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Chore"><AssignChoreForm mode="create" onSuccess={msg => { setShowAssignModal(false); setSuccessMessage(msg) }} onCancel={() => setShowAssignModal(false)} /></Modal>`.
- A `Toast` (same component/pattern already used on `AssignmentsPage`) displays `successMessage` after the modal closes.

## Data Flow

`AssignChoreForm` owns the `createAssignment`/`updateAssignment` mutations directly via its internal `useAssignments()` call — neither `AssignmentsPage` nor `DashboardPage` passes mutation functions down. Both pages only supply `onSuccess`/`onCancel` callbacks and react to them (close modal/inline form, show toast).

Templates and the user list load through the existing React Query hooks (`useTemplates`, `useUsers`), which `DashboardPage` doesn't currently call. Opening the modal for the first time triggers one fetch of each; React Query caches the result for subsequent opens in the same session.

## Error Handling

Unchanged from today's behavior — validation and network errors are caught inside `AssignChoreForm` and rendered as the existing inline `alert-error` div within the form. The modal (or, on `AssignmentsPage`, the inline-expand form) stays open on error so the parent can correct input and retry, instead of closing and losing the in-progress form.

## Testing

- New `AssignChoreForm.test.tsx`: covers create mode, edit mode with pre-filled values, and the validation/submit-error path — migrated out of the relevant existing cases in `AssignmentsPage.test.tsx`, using the same `vi.mock` pattern for `useAssignments`/`useTemplates`/`useUsers`.
- `AssignmentsPage.test.tsx`: no changes expected. Its assertions target rendered labels/text (`getByLabelText('Template')`, `'Assign To'`, `getByText('Assign Chore')`, edit-prefill value check), which the extracted component continues to satisfy.
- New `Modal.test.tsx`: opens/closes in response to the `open` prop, calls `onClose` on backdrop click and on ESC (via the dialog's native `close` event).
- `DashboardPage.test.tsx`: new cases — the Assign Chore button renders when `user.role === 'PARENT'` and does not render for `'CHILD'`; clicking it opens the modal; a successful submission closes the modal and shows the success toast.
