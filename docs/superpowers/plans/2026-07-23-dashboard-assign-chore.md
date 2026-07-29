# Dashboard "Assign Chore" Quick Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a parent assign a chore directly from the main dashboard via a modal, instead of only from the Assignments page.

**Architecture:** Extract the assignment form already inline on `AssignmentsPage.tsx` into a standalone `AssignChoreForm` component, add a generic `Modal` primitive built on the native `<dialog>` element, then wire a parent-only button + modal into `DashboardPage.tsx`. `AssignmentsPage.tsx` is refactored to use the same extracted form so there's one implementation, not two.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS, React Query, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-23-dashboard-assign-chore-design.md`

## Global Constraints

- No new npm dependency for the modal — native `<dialog>` only.
- The Assign Chore button and modal render only when `user?.role === 'PARENT'`.
- `AssignmentsPage.tsx`'s existing test assertions in `frontend/src/__tests__/AssignmentsPage.test.tsx` must keep passing unmodified.
- `Modal`'s `title` prop is required (not optional) — it doubles as the dialog's accessible name via `aria-labelledby`.
- `AssignChoreForm`'s mode is derived from whether an `assignment` prop is passed (no separate `mode` prop).
- In edit mode, `AssignChoreForm`'s template select is disabled/read-only, because `PUT /api/assignments/:id` (`frontend/src/api/assignments.api.ts:47-56`) never applies template changes.
- On `DashboardPage.tsx`, `AssignChoreForm` is only mounted while the modal is open (not rendered-but-hidden), so its `useTemplates`/`useUsers` fetches don't fire until a parent actually opens the modal.
- Every PR that changes app behavior must bump `APP_VERSION` in both `package.json` files and `.env`/`.env.example`, per `AGENTS.md`/`docs/VERSION_MAP.md`.

---

### Task 1: `Modal` UI primitive

**Files:**
- Create: `frontend/src/components/ui/Modal.tsx`
- Modify: `frontend/src/test/setup.ts`
- Test: `frontend/src/__tests__/Modal.test.tsx`

**Interfaces:**
- Produces: `Modal({ open: boolean; onClose: () => void; title: string; children: React.ReactNode })`, exported from `frontend/src/components/ui/Modal.tsx`. Later tasks import it as `import { Modal } from '../components/ui/Modal'`.

**Background:** jsdom 23.2.0 (this project's test environment) does not implement `HTMLDialogElement.prototype.showModal`/`close` at all — verified by reading `frontend/node_modules/jsdom/lib/jsdom/living/nodes/HTMLDialogElement-impl.js` (an empty stub) and `frontend/node_modules/jsdom/lib/jsdom/living/generated/HTMLDialogElement.js` (only defines the `open` getter/setter, reflecting the `open` attribute — no `showModal`/`close` methods at all). Calling either method on a real `<dialog>` under jsdom throws `TypeError: ... is not a function`. A one-time polyfill in the shared test setup file fixes this for every test file that renders a `<dialog>`, instead of duplicating a stub per test file.

- [ ] **Step 1: Add a jsdom `<dialog>` polyfill to the shared test setup**

Modify `frontend/src/test/setup.ts` to the following (adds a `beforeEach`-free, module-level polyfill after the existing imports/setup):

```ts
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// jsdom's HTMLDialogElement has no showModal()/close() implementation at all
// (verified against jsdom's HTMLDialogElement-impl.js, which is an empty stub).
// Polyfill just enough real <dialog> behavior — including throwing on a
// redundant showModal() call, matching real browsers — so components using
// native <dialog> are testable.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      throw new DOMException(
        "Failed to execute 'showModal' on 'HTMLDialogElement': The element already has an 'open' attribute, and therefore cannot be opened modally.",
        'InvalidStateError'
      )
    }
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

- [ ] **Step 2: Write the failing test file**

Create `frontend/src/__tests__/Modal.test.tsx`:

```tsx
import { StrictMode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../components/ui/Modal'

describe('Modal', () => {
  it('sets the open attribute when open is true', () => {
    const { container } = render(
      <Modal open onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>
    )
    expect(container.querySelector('dialog')).toHaveAttribute('open')
  })

  it('removes the open attribute when open becomes false', () => {
    const { container, rerender } = render(
      <Modal open onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>
    )
    rerender(<Modal open={false} onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>)
    expect(container.querySelector('dialog')).not.toHaveAttribute('open')
  })

  it('does not throw under StrictMode double-invoked effects (idempotency guard)', () => {
    expect(() =>
      render(
        <StrictMode>
          <Modal open onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>
        </StrictMode>
      )
    ).not.toThrow()
  })

  it('calls onClose when the dialog fires a native close event (ESC/programmatic)', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal open onClose={onClose} title="Test Modal"><p>Body</p></Modal>)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop (the dialog element itself) is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose} title="Test Modal"><button>Inside</button></Modal>
    )
    fireEvent.click(container.querySelector('dialog')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking modal content', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test Modal"><button>Inside</button></Modal>)
    fireEvent.click(screen.getByText('Inside'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('gives the dialog an accessible name via aria-labelledby', () => {
    const { container } = render(
      <Modal open onClose={vi.fn()} title="Assign Chore"><p>Body</p></Modal>
    )
    const dialog = container.querySelector('dialog')!
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)).toHaveTextContent('Assign Chore')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/Modal.test.tsx`
Expected: FAIL — `Cannot find module '../components/ui/Modal'` (or similar resolution error), since the component doesn't exist yet.

- [ ] **Step 4: Implement `Modal.tsx`**

Create `frontend/src/components/ui/Modal.tsx`:

```tsx
import { ReactNode, useEffect, useId, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-md rounded-2xl border border-edge bg-surface p-6 text-zinc-100 backdrop:bg-black/60"
    >
      <h2 id={titleId} className="mb-4 font-display text-lg font-bold text-zinc-100">
        {title}
      </h2>
      {children}
    </dialog>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/Modal.test.tsx`
Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/Modal.tsx frontend/src/test/setup.ts frontend/src/__tests__/Modal.test.tsx
git commit -m "$(cat <<'EOF'
feat: add generic Modal primitive on native <dialog>

Polyfills jsdom's HTMLDialogElement (showModal/close are unimplemented
in jsdom 23.2.0) once in the shared test setup so any test rendering
a <dialog> works, instead of stubbing it per test file.
EOF
)"
```

---

### Task 2: `AssignChoreForm` component (extracted)

**Files:**
- Create: `frontend/src/components/AssignChoreForm.tsx`
- Test: `frontend/src/__tests__/AssignChoreForm.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `AssignChoreForm({ assignment?: Assignment; onSuccess: (message: string) => void; onCancel: () => void })`, exported from `frontend/src/components/AssignChoreForm.tsx`. Later tasks import it as `import { AssignChoreForm } from '../components/AssignChoreForm'`. `Assignment` is the existing type from `frontend/src/api/assignments.api.ts`.

**Background:** This is a straight extraction of the form currently inline in `frontend/src/pages/AssignmentsPage.tsx` (lines ~52-119, ~188-227), with one behavior change: the template select is disabled in edit mode (see Global Constraints).

- [ ] **Step 1: Write the failing test file**

Create `frontend/src/__tests__/AssignChoreForm.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AssignChoreForm } from '../components/AssignChoreForm'

const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../hooks/useAssignments', () => ({ useAssignments: vi.fn() }))
vi.mock('../hooks/useTemplates', () => ({ useTemplates: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const defaultAssignment = {
  id: 1,
  choreTemplateId: 1,
  assignedToId: 2,
  dueDate: '2026-06-15',
  status: 'PENDING' as const,
  completedAt: null,
  pointsAwarded: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
  assignedTo: { id: 2, name: 'Alice', color: '#10B981' },
}

function mockState(overrides: {
  assignments?: Record<string, unknown>
  templates?: unknown[]
  users?: unknown[]
} = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    createAssignment: mockCreate,
    updateAssignment: mockUpdate,
    isCreating: false,
    isUpdating: false,
    ...overrides.assignments,
  })
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({
    templates: overrides.templates ?? [
      { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen', description: null, createdById: 1, createdAt: '', updatedAt: '' },
    ],
  })
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: overrides.users ?? [{ id: 2, name: 'Alice', role: 'CHILD', color: '#10B981' }],
  })
}

describe('AssignChoreForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState()
  })

  it('renders create mode with an editable template select', () => {
    render(<AssignChoreForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Template')).not.toBeDisabled()
    expect(screen.getByLabelText('Assign To')).toBeInTheDocument()
    expect(screen.getByLabelText('Due Date')).toBeInTheDocument()
  })

  it('submits the create payload and calls onSuccess', async () => {
    mockCreate.mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<AssignChoreForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assign To'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-01' } })
    fireEvent.click(screen.getByText('Save Assignment'))

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ templateId: 1, userId: 2, dueDate: '2026-07-01' })
    )
    expect(onSuccess).toHaveBeenCalledWith('Assignment created!')
  })

  it('renders edit mode with a disabled, pre-filled template select', () => {
    render(<AssignChoreForm assignment={defaultAssignment} onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const templateSelect = screen.getByLabelText('Template') as HTMLSelectElement
    expect(templateSelect).toBeDisabled()
    expect(templateSelect.value).toBe('1')
  })

  it('submits the update payload without templateId and calls onSuccess', async () => {
    mockUpdate.mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<AssignChoreForm assignment={defaultAssignment} onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-05' } })
    fireEvent.click(screen.getByText('Save Assignment'))

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(1, { userId: 2, dueDate: '2026-07-05' })
    )
    expect(onSuccess).toHaveBeenCalledWith('Assignment updated!')
  })

  it('shows an inline error and stays open when submit fails', async () => {
    mockCreate.mockRejectedValue(new Error('network error'))
    render(<AssignChoreForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assign To'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-01' } })
    fireEvent.click(screen.getByText('Save Assignment'))

    expect(await screen.findByText('Failed to save assignment. Please try again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Template')).toBeInTheDocument()
  })

  it('calls onCancel when Discard changes is clicked', () => {
    const onCancel = vi.fn()
    render(<AssignChoreForm onSuccess={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Discard changes'))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/AssignChoreForm.test.tsx`
Expected: FAIL — module `../components/AssignChoreForm` not found.

- [ ] **Step 3: Implement `AssignChoreForm.tsx`**

Create `frontend/src/components/AssignChoreForm.tsx`:

```tsx
import { useState } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'
import { Button } from './ui/Button'
import type { Assignment } from '../api/assignments.api'

interface AssignChoreFormProps {
  assignment?: Assignment
  onSuccess: (message: string) => void
  onCancel: () => void
}

export function AssignChoreForm({ assignment, onSuccess, onCancel }: AssignChoreFormProps) {
  const { createAssignment, isCreating, updateAssignment, isUpdating } = useAssignments()
  const { templates } = useTemplates()
  const { users } = useUsers()

  const isEditing = assignment !== undefined
  const children = users.filter(u => u.role === 'CHILD')

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    assignment ? String(assignment.choreTemplateId) : ''
  )
  const [selectedUserId, setSelectedUserId] = useState(
    assignment ? String(assignment.assignedToId) : ''
  )
  const [dueDate, setDueDate] = useState(assignment ? assignment.dueDate : '')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      if (assignment) {
        await updateAssignment(assignment.id, {
          userId: parseInt(selectedUserId, 10),
          dueDate,
        })
        onSuccess('Assignment updated!')
      } else {
        await createAssignment({
          templateId: parseInt(selectedTemplateId, 10),
          userId: parseInt(selectedUserId, 10),
          dueDate,
        })
        onSuccess('Assignment created!')
      }
    } catch {
      setFormError('Failed to save assignment. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="alert-error mb-4">{formError}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="template" className="block text-sm font-normal text-zinc-300 mb-1">Template</label>
          <select
            id="template"
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="input"
            required
            disabled={isEditing}
          >
            <option value="">Select a template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.points} pts)</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assignTo" className="block text-sm font-normal text-zinc-300 mb-1">Assign To</label>
          <select
            id="assignTo"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="input"
            required
          >
            <option value="">Select a family member...</option>
            {children.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-normal text-zinc-300 mb-1">Due Date</label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button type="submit" loading={isCreating || isUpdating}>
          {isCreating || isUpdating ? 'Saving...' : 'Save Assignment'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isCreating || isUpdating}>
          Discard changes
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/AssignChoreForm.test.tsx`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AssignChoreForm.tsx frontend/src/__tests__/AssignChoreForm.test.tsx
git commit -m "$(cat <<'EOF'
feat: extract AssignChoreForm from AssignmentsPage

Standalone form component so it can be reused from the dashboard's
new quick-action modal. Template select is now disabled in edit mode
since PUT /api/assignments/:id never applied template changes there.
EOF
)"
```

---

### Task 3: Refactor `AssignmentsPage.tsx` to use `AssignChoreForm`

**Files:**
- Modify: `frontend/src/pages/AssignmentsPage.tsx`
- Verify (no changes): `frontend/src/__tests__/AssignmentsPage.test.tsx`

**Interfaces:**
- Consumes: `AssignChoreForm` from Task 2 (`import { AssignChoreForm } from '../components/AssignChoreForm'`).
- Produces: nothing new for later tasks — this task only removes duplicated logic from an existing page.

**Note:** the existing page-level `formError` state stays, used only by `handleDelete`'s failure path (unchanged existing behavior — this is a pre-existing quirk where that alert only ever renders while `showForm` is true, since it lives inside the same conditional block; not something this refactor changes or needs to fix).

- [ ] **Step 1: Replace the inline form with `AssignChoreForm`**

Replace the full contents of `frontend/src/pages/AssignmentsPage.tsx` with:

```tsx
import { useState, useMemo, useEffect } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useUsers } from '../hooks/useUsers'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { FilterBar } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { AssignChoreForm } from '../components/AssignChoreForm'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Assignment } from '../api/assignments.api'
import { Skeleton } from '../components/ui/Skeleton'
import { formatDateStatus } from '../utils/dateFormat'
import { assignmentKey } from '../utils/assignmentKey'

function currentMonthDates(): { from: string; to: string } {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const to = lastDay.toISOString().split('T')[0]
  return { from, to }
}

export function AssignmentsPage() {
  const { assignments, isLoading, error, deleteAssignment, isDeleting } = useAssignments()
  const { users } = useUsers()

  const initialDates = currentMonthDates()
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(initialDates.from)
  const [dateTo, setDateTo] = useState(initialDates.to)
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

  function clearFilters() {
    setStatusFilter('all')
    setUserFilter('all')
    const { from, to } = currentMonthDates()
    setDateFrom(from)
    setDateTo(to)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingAssignment(null)
  }

  function openCreate() {
    setShowForm(true)
    setEditingAssignment(null)
  }

  function openEdit(assignment: Assignment) {
    setShowForm(true)
    setEditingAssignment(assignment)
  }

  async function handleDelete(id: number) {
    try {
      await deleteAssignment(id)
      setDeletingAssignmentKey(null)
      setSuccessMessage('Assignment removed.')
    } catch {
      setFormError('Failed to delete assignment. It may be completed — uncomplete it first.')
    }
  }

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter.toUpperCase()) return false
      if (userFilter !== 'all' && a.assignedToId !== parseInt(userFilter, 10)) return false
      if (dateFrom && a.dueDate < dateFrom) return false
      if (dateTo && a.dueDate > dateTo) return false
      return true
    })
  }, [assignments, statusFilter, userFilter, dateFrom, dateTo])

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="font-display text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-4">Unable to load assignments. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Chore Assignments" />

      {assignments.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-lg font-bold text-zinc-100 mb-1">No assignments yet</p>
          <p className="text-zinc-400 mb-4">Assign a chore to a family member to get started.</p>
          <Button onClick={openCreate} className="mx-auto">
            <Plus className="h-4 w-4" /> Assign Chore
          </Button>
        </div>
      ) : (
        <>
          {!showForm && (
            <Button onClick={openCreate} className="mb-4">
              <Plus className="h-4 w-4" /> Assign Chore
            </Button>
          )}

          {showForm && (
            <div className="p-6 mb-4 rounded-2xl border border-edge bg-surface">
              {formError && <div className="alert-error mb-4">{formError}</div>}
              <AssignChoreForm
                assignment={editingAssignment ?? undefined}
                onSuccess={msg => { setSuccessMessage(msg); cancelForm() }}
                onCancel={cancelForm}
              />
            </div>
          )}

          <FilterBar
            statusFilter={statusFilter} onStatusChange={setStatusFilter}
            userFilter={userFilter} onUserChange={setUserFilter}
            users={users}
            dateFrom={dateFrom} onDateFromChange={setDateFrom}
            dateTo={dateTo} onDateToChange={setDateTo}
            onClear={clearFilters} showUserFilter
          />

          {filtered.length === 0 && assignments.length > 0 ? (
            <div className="text-center py-8 text-zinc-400">
              No assignments match your filters.{' '}
              <button onClick={clearFilters} className="text-accent hover:underline">Clear filters</button>
            </div>
          ) : filtered.length > 0 ? (
            <Card className="mt-4">
              <div className="grid grid-cols-5 px-4 py-3 border-b border-edge bg-white/5 text-sm font-normal text-zinc-400">
                <div>Chore</div>
                <div>Due Date</div>
                <div>Status</div>
                <div>Points</div>
                <div>Actions</div>
              </div>
              {filtered.map(assignment => {
                const { label: dueDateLabel, isOverdue } = formatDateStatus(assignment.dueDate)
                return (
                  <div key={assignmentKey(assignment)}>
                    <div className="grid grid-cols-5 gap-2 px-4 py-3 items-center hover:bg-white/5">
                      <div>
                        <div className="font-bold text-zinc-100">{assignment.template.title}</div>
                        <div className="text-sm text-zinc-400">{assignment.assignedTo.name}</div>
                      </div>
                      <div className={isOverdue && assignment.status === 'PENDING' ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                        {dueDateLabel}
                      </div>
                      <div>
                        <StatusBadge status={assignment.status} overdue={isOverdue && assignment.status === 'PENDING'} />
                      </div>
                      <div className="text-zinc-400 text-sm">
                        {assignment.pointsAwarded !== null ? `${assignment.pointsAwarded} pts` : `${assignment.template.points} pts`}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(assignment)} className="p-1 text-zinc-500 hover:text-zinc-100" aria-label="Edit assignment">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletingAssignmentKey(assignmentKey(assignment))} className="p-1 text-zinc-500 hover:text-rose-400" aria-label="Delete assignment">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {deletingAssignmentKey === assignmentKey(assignment) && (
                      <div className="px-4 pb-3">
                        <ConfirmDelete
                          message="This assignment will be permanently removed. The chore template will not be affected. Continue?"
                          deleteLabel="Delete Assignment"
                          keepLabel="Keep Assignment"
                          onDelete={() => handleDelete(assignment.id)}
                          onCancel={() => setDeletingAssignmentKey(null)}
                          isDeleting={isDeleting}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>
          ) : null}
        </>
      )}

      {successMessage && (
        <Toast kind="success">{successMessage}</Toast>
      )}
    </AppShell>
  )
}
```

- [ ] **Step 2: Run the existing page test suite to confirm no regression**

Run: `cd frontend && npx vitest run src/__tests__/AssignmentsPage.test.tsx`
Expected: PASS — all 7 existing tests green, unmodified.

- [ ] **Step 3: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AssignmentsPage.tsx
git commit -m "$(cat <<'EOF'
refactor: use extracted AssignChoreForm on AssignmentsPage

No behavior change for this page beyond AssignChoreForm's own
template-select-disabled-in-edit-mode fix (see prior commit) —
existing AssignmentsPage tests pass unmodified.
EOF
)"
```

---

### Task 4: Dashboard "Assign Chore" quick action

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/__tests__/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `Modal` from Task 1 (`import { Modal } from '../components/ui/Modal'`), `AssignChoreForm` from Task 2 (`import { AssignChoreForm } from '../components/AssignChoreForm'`).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `frontend/src/__tests__/DashboardPage.test.tsx` with:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { DashboardPage } from '../pages/DashboardPage'

// jsdom has no matchMedia — simulate reduced motion so CountUp values render instantly.
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia
}

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useAssignments', () => ({
  useAssignments: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn(),
}))

vi.mock('../hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useMyPoints, useLeaderboard, useGamification } from '../hooks/usePoints'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const mockUser = { id: 1, name: 'Alice', role: 'CHILD', email: 'alice@home.local', color: '#10B981' }

function mockAuth(user: typeof mockUser | null = mockUser) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

function mockAssignmentsState(overrides: Record<string, unknown> = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [],
    isLoading: false,
    error: null,
    createAssignment: vi.fn(),
    isCreating: false,
    updateAssignment: vi.fn(),
    isUpdating: false,
    ...overrides,
  })
}

function mockPointsState(overrides: Record<string, unknown> = {}) {
  ;(useMyPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { balance: 30 },
    isLoading: false,
    error: null,
    ...overrides,
  })
  ;(useLeaderboard as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false })
  ;(useGamification as ReturnType<typeof vi.fn>).mockReturnValue({
    data: {
      streak: 3,
      level: { level: 1, lifetimePoints: 0, currentThreshold: 0, nextThreshold: 50, progress: 0 },
      badges: [],
    },
    isLoading: false,
  })
}

function mockTemplatesState(overrides: Record<string, unknown> = {}) {
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({ templates: [], ...overrides })
}

function mockUsersState(overrides: Record<string, unknown> = {}) {
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({ users: [], ...overrides })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockMatchMedia(true)
    mockAuth()
    mockAssignmentsState()
    mockPointsState()
    mockTemplatesState()
    mockUsersState()
  })

  it('greets the user by name', () => {
    renderPage()
    expect(screen.getByText(/hey alice/i)).toBeInTheDocument()
  })

  it('shows the points balance', () => {
    renderPage()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows the weekly streak stat', () => {
    renderPage()
    const streakCard = screen.getByText('Streak').closest('div')
    expect(streakCard).not.toBeNull()
    expect(streakCard).toHaveTextContent('3')
  })

  it('shows an empty state when there are no upcoming chores', () => {
    renderPage()
    expect(screen.getByText('No upcoming chores')).toBeInTheDocument()
  })

  it('shows an error message when assignments fail to load', () => {
    mockAssignmentsState({ error: new Error('boom') })
    renderPage()
    expect(screen.getByText('Unable to load upcoming chores.')).toBeInTheDocument()
  })

  it('lists upcoming chores assigned to the current user', () => {
    const now = new Date()
    const inTwoDays = new Date(now)
    inTwoDays.setDate(now.getDate() + 2)

    mockAssignmentsState({
      assignments: [
        {
          id: 1,
          choreTemplateId: 1,
          assignedToId: mockUser.id,
          dueDate: inTwoDays.toISOString(),
          status: 'PENDING',
          completedAt: null,
          pointsAwarded: null,
          notes: null,
          createdAt: now.toISOString(),
          template: { id: 1, title: 'Wash Dishes', points: 5, category: 'Kitchen' },
          assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
        },
        {
          id: 2,
          choreTemplateId: 2,
          assignedToId: 999, // not the current user — must be excluded
          dueDate: inTwoDays.toISOString(),
          status: 'PENDING',
          completedAt: null,
          pointsAwarded: null,
          notes: null,
          createdAt: now.toISOString(),
          template: { id: 2, title: 'Not Mine', points: 5, category: null },
          assignedTo: { id: 999, name: 'Bob', color: '#F59E0B' },
        },
      ],
    })

    renderPage()

    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.queryByText('Not Mine')).not.toBeInTheDocument()
  })

  it('shows the leaderboard when entries exist', () => {
    ;(useLeaderboard as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ user: { id: 1, name: 'Alice', color: '#10B981', role: 'CHILD' }, balance: 30 }],
      isLoading: false,
    })
    renderPage()
    // "Alice" also appears in TopNav, so assert on the leaderboard's own entry (name + pts).
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('pts').length).toBeGreaterThan(0)
  })

  it('shows a placeholder when no points have been earned yet', () => {
    renderPage()
    expect(screen.getByText('No points earned yet.')).toBeInTheDocument()
  })

  describe('weekly progress and due-today (frozen clock)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: new Date('2026-06-17T12:00:00Z'), toFake: ['Date'] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('computes week math including boundaries, excluding other users and out-of-week dates', () => {
      mockAssignmentsState({
        assignments: [
          {
            id: 1,
            choreTemplateId: 1,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-15T09:00:00').toISOString(), // Mon, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-15T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 1, title: 'Mon Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 2,
            choreTemplateId: 2,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-17T09:00:00').toISOString(), // Wed, in-week (today)
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 2, title: 'Wed Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 3,
            choreTemplateId: 3,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-21T09:00:00').toISOString(), // Sun, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-21T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 3, title: 'Sun Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 4,
            choreTemplateId: 4,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-14T09:00:00').toISOString(), // prior Sun, out of week
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-01T09:00:00').toISOString(),
            template: { id: 4, title: 'Prior Sun Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 5,
            choreTemplateId: 5,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-22T09:00:00').toISOString(), // next Mon, out of week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-22T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 5, title: 'Next Mon Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 6,
            choreTemplateId: 6,
            assignedToId: 999, // other user, in-week — must be excluded from counts
            dueDate: new Date('2026-06-16T09:00:00').toISOString(), // Tue, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-16T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 6, title: 'Other User Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: 999, name: 'Bob', color: '#F59E0B' },
          },
        ],
      })

      renderPage()

      expect(screen.getByRole('img', { name: '2 of 3' })).toBeInTheDocument()
      expect(screen.getByText('2 of 3 done')).toBeInTheDocument()
      expect(screen.getByText(/keep it going!/i)).toBeInTheDocument()
    })

    it('counts only in-week, current-user PENDING assignments due today for "Due today"', () => {
      mockAssignmentsState({
        assignments: [
          {
            id: 1,
            choreTemplateId: 1,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-17T09:00:00').toISOString(), // today
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 1, title: 'Today Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 2,
            choreTemplateId: 2,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-18T09:00:00').toISOString(), // tomorrow
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 2, title: 'Tomorrow Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
        ],
      })

      renderPage()

      const dueTodayCard = screen.getByText('Due today').closest('div')
      expect(dueTodayCard).not.toBeNull()
      expect(dueTodayCard).toHaveTextContent('1')
    })

    it('shows the week-complete message when all in-week assignments are done', () => {
      mockAssignmentsState({
        assignments: [
          {
            id: 1,
            choreTemplateId: 1,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-15T09:00:00').toISOString(), // Mon, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-15T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 1, title: 'Mon Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 2,
            choreTemplateId: 2,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-17T09:00:00').toISOString(), // Wed, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-17T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 2, title: 'Wed Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
        ],
      })

      renderPage()

      expect(screen.getByRole('img', { name: '2 of 2' })).toBeInTheDocument()
      expect(screen.getByText(/week complete/i)).toBeInTheDocument()
    })
  })

  describe('Assign Chore quick action', () => {
    beforeEach(() => {
      mockTemplatesState({
        templates: [
          { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen', description: null, createdById: 1, createdAt: '', updatedAt: '' },
        ],
      })
      mockUsersState({ users: [{ id: 2, name: 'Bob', role: 'CHILD', color: '#F59E0B' }] })
    })

    it('shows the Assign Chore button for a PARENT', () => {
      mockAuth({ ...mockUser, role: 'PARENT' })
      renderPage()
      expect(screen.getByText('Assign Chore')).toBeInTheDocument()
    })

    it('does not show the Assign Chore button for a CHILD', () => {
      mockAuth({ ...mockUser, role: 'CHILD' })
      renderPage()
      expect(screen.queryByText('Assign Chore')).not.toBeInTheDocument()
    })

    it('opens the modal with the assign form when Assign Chore is clicked', () => {
      mockAuth({ ...mockUser, role: 'PARENT' })
      renderPage()
      fireEvent.click(screen.getByText('Assign Chore'))
      expect(screen.getByLabelText('Template')).toBeInTheDocument()
    })

    it('closes the modal and shows a success toast after a successful submission', async () => {
      mockAuth({ ...mockUser, role: 'PARENT' })
      const mockCreate = vi.fn().mockResolvedValue({})
      mockAssignmentsState({ createAssignment: mockCreate })
      renderPage()

      fireEvent.click(screen.getByText('Assign Chore'))
      fireEvent.change(screen.getByLabelText('Template'), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText('Assign To'), { target: { value: '2' } })
      fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-01' } })
      fireEvent.click(screen.getByText('Save Assignment'))

      expect(await screen.findByText('Assignment created!')).toBeInTheDocument()
      expect(screen.queryByLabelText('Template')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run the test to verify the new cases fail**

Run: `cd frontend && npx vitest run src/__tests__/DashboardPage.test.tsx`
Expected: FAIL — the four "Assign Chore quick action" tests fail (`getByText('Assign Chore')` not found); all pre-existing tests still pass since `DashboardPage.tsx` hasn't changed yet.

- [ ] **Step 3: Implement the dashboard button and modal**

Replace the full contents of `frontend/src/pages/DashboardPage.tsx` with:

```tsx
import { useMemo, useState, useEffect } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { formatDueDate } from '../utils/dateFormat'
import { assignmentKey } from '../utils/assignmentKey'
import { useAssignments } from '../hooks/useAssignments'
import { useMyPoints, useLeaderboard, useGamification } from '../hooks/usePoints'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { Leaderboard } from '../components/Leaderboard'
import { AssignChoreForm } from '../components/AssignChoreForm'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'

export function DashboardPage() {
  const { user } = useAuth()
  const { assignments, isLoading, error } = useAssignments()
  const { data: myPoints } = useMyPoints()
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard()
  const { data: gamification } = useGamification()

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const mine = useMemo(
    () => assignments.filter(a => a.assignedToId === user?.id),
    [assignments, user]
  )

  const upcoming = useMemo(() => {
    return mine
      .filter(a => a.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [mine])

  const week = useMemo(() => {
    const now = new Date()
    const day = (now.getUTCDay() + 6) % 7 // 0 = Monday
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
    const nextMonday = new Date(monday)
    nextMonday.setUTCDate(monday.getUTCDate() + 7)
    const thisWeek = mine.filter(a => {
      const due = new Date(a.dueDate)
      return due >= monday && due < nextMonday
    })
    return {
      total: thisWeek.length,
      done: thisWeek.filter(a => a.status === 'COMPLETED').length,
    }
  }, [mine])

  const dueToday = useMemo(() => {
    const now = new Date()
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const tomorrowUTC = todayUTC + 86400000
    return mine.filter(a => {
      const due = new Date(a.dueDate).getTime()
      return a.status === 'PENDING' && due >= todayUTC && due < tomorrowUTC
    }).length
  }, [mine])

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-zinc-100">Hey {user?.name} 👋</h2>
        {user?.role === 'PARENT' && (
          <Button onClick={() => setShowAssignModal(true)} className="mt-3 w-full justify-center">
            <Plus className="h-4 w-4" /> Assign Chore
          </Button>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Points">
          <CountUp value={myPoints?.balance ?? 0} /> <span className="text-base text-zinc-500">pts</span>
        </StatCard>
        <StatCard label="Due today">{dueToday}</StatCard>
        <StatCard label="Streak">
          <span aria-hidden>🔥</span> {gamification?.streak ?? 0}{' '}
          <span className="text-base text-zinc-500">wk</span>
        </StatCard>
        <Card className="col-span-2 flex items-center justify-between lg:col-span-2">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500">This week</span>
            <p className="mt-1 font-display text-lg font-bold text-zinc-100">
              {week.done} of {week.total} done
            </p>
            <p className="text-sm text-zinc-400">
              {week.total > 0 && week.done === week.total ? 'Week complete — nice! 🎉' : 'Keep it going!'}
            </p>
          </div>
          <ProgressRing value={week.done} max={week.total} size={88} label={`${week.done} of ${week.total}`} />
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Upcoming Chores</h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400">Unable to load upcoming chores.</p>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No upcoming chores" hint="Enjoy your free time!" />
          ) : (
            <div className="space-y-3">
              {upcoming.map(assignment => {
                const { label: dueLabel, isOverdue } = formatDueDate(assignment.dueDate)
                return (
                  <Card key={assignmentKey(assignment)} className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-100">{assignment.template.title}</div>
                      <div className="text-sm text-zinc-400">
                        {assignment.template.category && `${assignment.template.category} · `}
                        <span className={isOverdue ? 'font-bold text-rose-400' : ''}>
                          {isOverdue ? 'Overdue' : dueLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={assignment.status} overdue={isOverdue} />
                      <span className="text-sm text-zinc-400">{assignment.template.points} pts</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Leaderboard</h3>
          {isLeaderboardLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <Leaderboard entries={leaderboard} limit={3} />
          ) : (
            <p className="text-sm text-zinc-500">No points earned yet.</p>
          )}
        </section>
      </div>

      {user?.role === 'PARENT' && (
        <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Chore">
          {showAssignModal && (
            <AssignChoreForm
              onSuccess={msg => { setShowAssignModal(false); setSuccessMessage(msg) }}
              onCancel={() => setShowAssignModal(false)}
            />
          )}
        </Modal>
      )}

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
    </AppShell>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/DashboardPage.test.tsx`
Expected: PASS — all tests green, including the new "Assign Chore quick action" cases.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/__tests__/DashboardPage.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Assign Chore quick action to the parent dashboard

Full-width button below the greeting, visible on mobile without
scrolling, opens AssignChoreForm in the new Modal. Parent-only.
AssignChoreForm mounts only while the modal is open, so its
templates/users fetches don't fire until a parent actually opens it.
EOF
)"
```

---

### Task 5: Version bump

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `CHANGELOG.md`
- Regenerate: `backend/package-lock.json`, `frontend/package-lock.json`

**Interfaces:** none — metadata-only task, no code interfaces produced or consumed.

- [ ] **Step 1: Bump `backend/package.json`**

In `backend/package.json`, change:

```json
  "version": "3.2.5",
```

to:

```json
  "version": "3.2.6",
```

- [ ] **Step 2: Bump `frontend/package.json`**

In `frontend/package.json`, change:

```json
  "version": "3.2.5",
```

to:

```json
  "version": "3.2.6",
```

- [ ] **Step 3: Regenerate both lockfiles**

Per `docs/VERSION_MAP.md`, lockfiles must be regenerated via `npm install`, never hand-patched with `sed`.

Run:
```bash
rm backend/package-lock.json && rm -rf backend/node_modules && (cd backend && npm install)
rm frontend/package-lock.json && rm -rf frontend/node_modules && (cd frontend && npm install)
```
Expected: both commands complete without error, and both `package-lock.json` files' root `version` fields now read `3.2.6`.

- [ ] **Step 4: Sync `.env` and `.env.example`**

In `.env`, find the line starting with `APP_VERSION=` and set it to:

```
APP_VERSION=3.2.6
```

In `.env.example`, change:

```
APP_VERSION=3.2.5
```

to:

```
APP_VERSION=3.2.6
```

- [ ] **Step 5: Add a CHANGELOG entry**

In `CHANGELOG.md`, insert a new entry directly above the existing `## [3.2.5] - 2026-07-22` line:

```markdown
## [3.2.6] - 2026-07-23

### Added
- "Assign Chore" quick action on the parent dashboard — a full-width button below the greeting opens a modal to assign a chore without navigating to the Assignments page
- Reusable `Modal` UI primitive built on the native `<dialog>` element

### Fixed
- The assignment edit form's template selector is now read-only, since `PUT /api/assignments/:id` never applied template changes made there

```

- [ ] **Step 6: Run both test suites once more to confirm the lockfile regeneration didn't break anything**

Run: `cd backend && npm test`
Expected: PASS

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/package.json frontend/package.json backend/package-lock.json frontend/package-lock.json .env .env.example CHANGELOG.md
git commit -m "$(cat <<'EOF'
chore: bump version to 3.2.6

Dashboard Assign Chore quick action + AssignChoreForm/Modal extraction.
EOF
)"
```

## Self-Review

**Spec coverage:**
- Scope item 1 (extract `AssignChoreForm`) → Task 2, 3.
- Scope item 2 (`Modal` primitive) → Task 1.
- Scope item 3 (dashboard button + modal) → Task 4.
- Scope item 4 (no UX change to `AssignmentsPage`, except item 5) → Task 3.
- Scope item 5 (template read-only in edit mode) → Task 2.
- Scope item 6 (version bump) → Task 5.
- Non-Goal (lazy mount) → Task 4, `{showAssignModal && <AssignChoreForm .../>}`.
- Non-Goal (parent-only) → Task 4, `user?.role === 'PARENT'` gates both the button and the `Modal`.
- Testing section's Modal guard/backdrop/StrictMode cases → Task 1. `AssignChoreForm` create/edit/error/cancel cases → Task 2. `AssignmentsPage` unmodified → Task 3. `DashboardPage` role/open/success cases → Task 4.

**Placeholder scan:** none found — every step has complete, runnable code and exact commands.

**Type consistency:** `AssignChoreForm`'s prop shape (`assignment?: Assignment`, `onSuccess: (message: string) => void`, `onCancel: () => void`) is identical across Task 2's implementation, Task 3's `AssignmentsPage` usage, and Task 4's `DashboardPage` usage. `Modal`'s prop shape (`open`, `onClose`, `title`, `children`) is identical across Task 1's implementation and Task 4's usage.
