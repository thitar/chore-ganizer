# Fix Silently-Swallowed Delete Error on AssignmentsPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When deleting an assignment fails on `AssignmentsPage`, show the user a visible error instead of silently swallowing it.

**Architecture:** `AssignmentsPage.tsx` currently stores the delete-failure message in a `formError` state variable, but only renders it inside the `{showForm && (...)}` block — a location that's never visible during a delete (the create/edit form isn't open when the user deletes a row). Fix: rename the state to `errorMessage`, give it the same self-dismissing-after-3s behavior the page already uses for `successMessage`, and render it as a fixed-position `<Toast kind="error">` (an existing, already-imported component) instead of an inline div nested inside the form.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library, existing `Toast` UI primitive (`frontend/src/components/ui/Toast.tsx`, already supports `kind="error"`).

## Global Constraints

- Every PR that changes app behavior must bump `APP_VERSION` in both `backend/package.json` and `frontend/package.json` (identical values) — see `docs/OPERATIONS.md#version-bumps`. If unsure of the exact next version number, ask the user before bumping (do not guess).
- Frontend tests: `cd frontend && npm test` (`vitest run`).
- Bug fixes get logged in `docs/project_notes/bugs.md` per the project's memory-system convention in `CLAUDE.md`.
- No backend changes are needed — this is a frontend-only rendering/state bug.

---

### Task 1: Add a failing test that reproduces the bug

**Files:**
- Modify: `frontend/src/__tests__/AssignmentsPage.test.tsx`

**Interfaces:**
- Consumes: existing `mockAssignmentsState()`, `mockDelete` (a `vi.fn()` already wired as `deleteAssignment` in the mock), `defaultAssignment`, `renderPage()` helpers already defined at the top of this file.
- Produces: nothing new — this step only adds a test case to the existing `describe('AssignmentsPage', ...)` block.

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('AssignmentsPage', ...)` block in `frontend/src/__tests__/AssignmentsPage.test.tsx`, after the `'shows delete confirmation when delete icon clicked'` test:

```tsx
  it('shows a visible error when deleting an assignment fails', async () => {
    mockAssignmentsState({ assignments: [defaultAssignment] })
    mockDelete.mockRejectedValue(new Error('conflict'))
    renderPage()

    fireEvent.click(screen.getByLabelText('Delete assignment'))
    fireEvent.click(screen.getByText('Delete Assignment'))

    expect(
      await screen.findByText('Failed to delete assignment. It may be completed — uncomplete it first.')
    ).toBeInTheDocument()
  })
```

Note: this test does not open the create/edit form (`showForm` stays `false`) — that's the whole point. It confirms the error is visible purely from the delete-confirmation flow.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/AssignmentsPage.test.tsx -t "shows a visible error when deleting an assignment fails"`

Expected: FAIL — `screen.findByText(...)` times out because the error text is set in state (`formError`) but never rendered (it's nested inside `{showForm && (...)}`, which is `false` here).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/AssignmentsPage.test.tsx
git commit -m "test: reproduce silently-swallowed delete error on AssignmentsPage"
```

---

### Task 2: Fix `AssignmentsPage.tsx` to show the error via Toast

**Files:**
- Modify: `frontend/src/pages/AssignmentsPage.tsx:36-47` (state + effect), `:72-80` (handleDelete), `:137-146` (dead inline error block), `:218-220` (toast render)
- Test: `frontend/src/__tests__/AssignmentsPage.test.tsx` (from Task 1)

**Interfaces:**
- Consumes: `Toast` component from `../components/ui/Toast` (already imported at `frontend/src/pages/AssignmentsPage.tsx:8`), which accepts `kind: 'success' | 'error'` and renders `children` inside a fixed-position, self-styled box — no changes needed to `Toast.tsx` itself.
- Produces: no new exports; internal state rename only.

- [ ] **Step 1: Rename `formError` to `errorMessage` and give it the same auto-dismiss effect as `successMessage`**

In `frontend/src/pages/AssignmentsPage.tsx`, replace:

```tsx
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [deletingAssignmentKey, setDeletingAssignmentKey] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])
```

with:

```tsx
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [deletingAssignmentKey, setDeletingAssignmentKey] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])
```

- [ ] **Step 2: Update `handleDelete` to set `errorMessage`**

Replace:

```tsx
  async function handleDelete(id: number) {
    try {
      await deleteAssignment(id)
      setDeletingAssignmentKey(null)
      setSuccessMessage('Assignment removed.')
    } catch {
      setFormError('Failed to delete assignment. It may be completed — uncomplete it first.')
    }
  }
```

with:

```tsx
  async function handleDelete(id: number) {
    try {
      await deleteAssignment(id)
      setDeletingAssignmentKey(null)
      setSuccessMessage('Assignment removed.')
    } catch {
      setErrorMessage('Failed to delete assignment. It may be completed — uncomplete it first.')
    }
  }
```

- [ ] **Step 3: Remove the dead inline error block from inside the form**

Replace:

```tsx
          {showForm && (
            <div className="p-6 mb-4 rounded-2xl border border-edge bg-surface">
              {formError && <div className="alert-error mb-4">{formError}</div>}
              <AssignChoreForm
```

with:

```tsx
          {showForm && (
            <div className="p-6 mb-4 rounded-2xl border border-edge bg-surface">
              <AssignChoreForm
```

(`AssignChoreForm` already renders its own inline error for create/update failures — see `frontend/src/components/AssignChoreForm.tsx`'s `formError` state — so this deleted block was fully redundant for that case too.)

- [ ] **Step 4: Render the error as a Toast next to the existing success Toast**

Replace:

```tsx
      {successMessage && (
        <Toast kind="success">{successMessage}</Toast>
      )}
    </AppShell>
  )
}
```

with:

```tsx
      {successMessage && (
        <Toast kind="success">{successMessage}</Toast>
      )}
      {errorMessage && (
        <Toast kind="error">{errorMessage}</Toast>
      )}
    </AppShell>
  )
}
```

- [ ] **Step 5: Run the reproducing test to verify it now passes**

Run: `cd frontend && npx vitest run src/__tests__/AssignmentsPage.test.tsx -t "shows a visible error when deleting an assignment fails"`

Expected: PASS

- [ ] **Step 6: Run the full frontend test suite to check for regressions**

Run: `cd frontend && npm test`

Expected: all test files pass (no other test in `AssignmentsPage.test.tsx` or elsewhere references `formError`, `alert-error`, or relies on the removed inline block — confirmed by grep before writing this plan).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AssignmentsPage.tsx
git commit -m "fix: show assignment-delete errors via toast instead of swallowing them"
```

---

### Task 3: Log the bug, bump the version, update the changelog

**Files:**
- Modify: `docs/project_notes/bugs.md`
- Modify: `backend/package.json`, `frontend/package.json` (version field, must match)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing code-level — this task is documentation/versioning only, per `CLAUDE.md`'s "Version Bumps — Required With Every PR" and the project-memory bug-log convention.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Confirm the target version number with the user**

Before editing, ask the user what version to bump to (per `CLAUDE.md`: "If unsure what version to bump to, ask the user"). Check the current value in `frontend/package.json`/`backend/package.json` first — if PR #182 (which bumps to `3.3.3`) has already merged to `main`, the next patch version is `3.3.4`; if this fix lands before #182 merges, coordinate with the user on ordering.

- [ ] **Step 2: Add a bug-log entry**

Add a new dated entry at the top of the log section in `docs/project_notes/bugs.md` (matching the existing entry format — see the `2026-08-01` entry already in that file for the exact style), describing:
- **Issue**: Deleting an assignment on `AssignmentsPage` that fails (e.g. deleting a completed assignment) sets an error message that's rendered inside the `{showForm && (...)}` block, which is `false` during a delete — so the user sees no feedback at all.
- **Root Cause**: The error-display `<div>` was written when the same `formError` state was also used for the create/edit form's own submit failures (form always open in that case). The dashboard-assign-chore refactor (PR #182) extracted the create/edit form into `AssignChoreForm` with its own independent error state, leaving `AssignmentsPage`'s `formError` used only by `handleDelete` — but the render location wasn't moved, so it became unreachable.
- **Fix**: Renamed the state to `errorMessage`, gave it the same 3s auto-dismiss effect as the existing `successMessage`, and rendered it as a `<Toast kind="error">` (mirroring the existing success-toast pattern) instead of the dead inline block.
- **Prevention**: When extracting a sub-component out of a page (e.g. `AssignChoreForm` out of `AssignmentsPage`), audit every remaining use of state that the sub-component's new state now shadows or replaces — not just the code paths the extraction directly touched.
- **File**: `frontend/src/pages/AssignmentsPage.tsx`

- [ ] **Step 3: Bump the version**

In both `backend/package.json` and `frontend/package.json`, update the `"version"` field to the number confirmed with the user in Step 1. Both files must carry identical values.

- [ ] **Step 4: Update the changelog**

Add a new entry at the top of `CHANGELOG.md` (above the most recent existing entry), following the existing `## [X.Y.Z] - YYYY-MM-DD` / `### Fixed` format:

```markdown
## [<confirmed-version>] - 2026-08-01

### Fixed
- Assignment delete failures on the Assignments page now show a visible error toast instead of being silently swallowed
```

- [ ] **Step 5: Run the full frontend test suite one more time**

Run: `cd frontend && npm test`

Expected: all pass (version/changelog/docs edits don't touch test-relevant code).

- [ ] **Step 6: Commit**

```bash
git add docs/project_notes/bugs.md backend/package.json frontend/package.json CHANGELOG.md
git commit -m "chore: bump version, log delete-error-toast bug fix"
```
