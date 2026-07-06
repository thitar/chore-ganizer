import { useState, useMemo, useEffect } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { FilterBar } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Assignment } from '../api/assignments.api'
import { Skeleton } from '../components/ui/Skeleton'

function currentMonthDates(): { from: string; to: string } {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const to = lastDay.toISOString().split('T')[0]
  return { from, to }
}

export function AssignmentsPage() {
  const {
    assignments,
    isLoading,
    error,
    createAssignment,
    isCreating,
    updateAssignment,
    isUpdating,
    deleteAssignment,
    isDeleting,
  } = useAssignments()
  const { templates } = useTemplates()
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
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [dueDate, setDueDate] = useState('')

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

  function resetForm() {
    setSelectedTemplateId('')
    setSelectedUserId('')
    setDueDate('')
    setFormError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingAssignment(null)
    resetForm()
  }

  function openCreate() {
    setShowForm(true)
    setEditingAssignment(null)
    resetForm()
  }

  function openEdit(assignment: Assignment) {
    setShowForm(true)
    setEditingAssignment(assignment)
    setSelectedTemplateId(String(assignment.choreTemplateId))
    setSelectedUserId(String(assignment.assignedToId))
    setDueDate(assignment.dueDate)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      const data = {
        templateId: parseInt(selectedTemplateId, 10),
        userId: parseInt(selectedUserId, 10),
        dueDate,
      }
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, { userId: data.userId, dueDate: data.dueDate })
        setSuccessMessage('Assignment updated!')
      } else {
        await createAssignment(data)
        setSuccessMessage('Assignment created!')
      }
      cancelForm()
    } catch {
      setFormError('Failed to save assignment. Please try again.')
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteAssignment(id)
      setDeletingAssignmentId(null)
      setSuccessMessage('Assignment removed.')
    } catch {
      setFormError('Failed to delete assignment. It may be completed — uncomplete it first.')
    }
  }

  const children = useMemo(() => users.filter(u => u.role === 'CHILD'), [users])

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter.toUpperCase()) return false
      if (userFilter !== 'all' && a.assignedToId !== parseInt(userFilter, 10)) return false
      if (dateFrom && a.dueDate < dateFrom) return false
      if (dateTo && a.dueDate > dateTo) return false
      return true
    })
  }, [assignments, statusFilter, userFilter, dateFrom, dateTo])

  function formatDate(dateStr: string): { label: string; isOverdue: boolean } {
    const date = new Date(dateStr)
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    const dueDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      label: `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
      isOverdue: dueDateOnly < today,
    }
  }

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
            <form onSubmit={handleSubmit} className="p-6 mb-4 rounded-2xl border border-edge bg-surface">
              {formError && <div className="alert-error mb-4">{formError}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="template" className="block text-sm font-normal text-zinc-300 mb-1">Template</label>
                  <select id="template" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
                    className="input" required>
                    <option value="">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.points} pts)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="assignTo" className="block text-sm font-normal text-zinc-300 mb-1">Assign To</label>
                  <select id="assignTo" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                    className="input" required>
                    <option value="">Select a family member...</option>
                    {children.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-normal text-zinc-300 mb-1">Due Date</label>
                  <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="input" required />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" loading={isCreating || isUpdating}>
                  {isCreating || isUpdating ? 'Saving...' : 'Save Assignment'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelForm} disabled={isCreating || isUpdating}>
                  Discard changes
                </Button>
              </div>
            </form>
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
                const { label: dueDateLabel, isOverdue } = formatDate(assignment.dueDate)
                return (
                  <div key={assignment.id}>
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
                        <button onClick={() => setDeletingAssignmentId(assignment.id)} className="p-1 text-zinc-500 hover:text-rose-400" aria-label="Delete assignment">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {deletingAssignmentId === assignment.id && (
                      <div className="px-4 pb-3">
                        <ConfirmDelete
                          message="This assignment will be permanently removed. The chore template will not be affected. Continue?"
                          deleteLabel="Delete Assignment"
                          keepLabel="Keep Assignment"
                          onDelete={() => handleDelete(assignment.id)}
                          onCancel={() => setDeletingAssignmentId(null)}
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
