import { useState, useMemo, useEffect } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'
import { NavBar } from '../components/NavBar'
import { FilterBar } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Assignment } from '../api/assignments.api'

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
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading assignments...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Unable to load assignments. Check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Chore Assignments</h2>

        {assignments.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <p className="text-lg font-bold text-gray-900 mb-1">No assignments yet</p>
            <p className="text-gray-600 mb-4">Assign a chore to a family member to get started.</p>
            <button onClick={openCreate} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover flex items-center gap-1 mx-auto">
              <Plus className="h-4 w-4" /> Assign Chore
            </button>
          </div>
        ) : (
          <>
            {!showForm && (
              <button onClick={openCreate} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover mb-4 flex items-center gap-1">
                <Plus className="h-4 w-4" /> Assign Chore
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-4">
                {formError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{formError}</div>}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="template" className="block text-sm font-normal text-gray-700 mb-1">Template</label>
                    <select id="template" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white" required>
                      <option value="">Select a template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.points} pts)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="assignTo" className="block text-sm font-normal text-gray-700 mb-1">Assign To</label>
                    <select id="assignTo" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white" required>
                      <option value="">Select a family member...</option>
                      {children.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-normal text-gray-700 mb-1">Due Date</label>
                    <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={isCreating || isUpdating} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50">
                    {isCreating || isUpdating ? 'Saving...' : 'Save Assignment'}
                  </button>
                  <button type="button" onClick={cancelForm} disabled={isCreating || isUpdating} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Discard changes
                  </button>
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
              <div className="text-center py-8 text-gray-500">
                No assignments match your filters.{' '}
                <button onClick={clearFilters} className="text-primary hover:underline">Clear filters</button>
              </div>
            ) : filtered.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm mt-4">
                <div className="grid grid-cols-5 px-4 py-3 border-b bg-gray-50 text-sm font-normal text-gray-500">
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
                      <div className="grid grid-cols-5 gap-2 px-4 py-3 items-center hover:bg-gray-50">
                        <div>
                          <div className="font-bold text-gray-900">{assignment.template.title}</div>
                          <div className="text-sm text-gray-500">{assignment.assignedTo.name}</div>
                        </div>
                        <div className={isOverdue && assignment.status === 'PENDING' ? 'text-red-600 font-bold' : 'text-gray-600'}>
                          {dueDateLabel}
                        </div>
                        <div>
                          <StatusBadge status={assignment.status} overdue={isOverdue && assignment.status === 'PENDING'} />
                        </div>
                        <div className="text-gray-600 text-sm">
                          {assignment.pointsAwarded !== null ? `${assignment.pointsAwarded} pts` : `${assignment.template.points} pts`}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(assignment)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Edit assignment">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeletingAssignmentId(assignment.id)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete assignment">
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
              </div>
            ) : null}
          </>
        )}
      </main>

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}
    </div>
  )
}
