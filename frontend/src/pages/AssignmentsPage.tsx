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

export function AssignmentsPage() {
  const { assignments, isLoading, error, deleteAssignment, isDeleting } = useAssignments()
  const { users } = useUsers()

  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
    setDateFrom('')
    setDateTo('')
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
