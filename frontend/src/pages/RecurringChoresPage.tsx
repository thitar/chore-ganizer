import { useState, useEffect } from 'react'
import { useRecurringChores } from '../hooks/useRecurringChores'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'
import { NavBar } from '../components/NavBar'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Trash2 } from 'lucide-react'

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function frequencyDescription(chore: {
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
}): string {
  if (chore.frequency === 'DAILY') return 'Daily'
  if (chore.frequency === 'WEEKLY' && chore.dayOfWeek !== null) {
    return `Weekly (${WEEKDAY_LABELS[chore.dayOfWeek]})`
  }
  if (chore.frequency === 'MONTHLY' && chore.dayOfMonth !== null) {
    return `Monthly (day ${chore.dayOfMonth})`
  }
  return chore.frequency
}

export function RecurringChoresPage() {
  const {
    recurringChores,
    isLoading,
    error,
    createRecurringChore,
    isCreating,
    deleteRecurringChore,
    isDeleting,
  } = useRecurringChores()
  const { templates } = useTemplates()
  const { users } = useUsers()

  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const childUsers = users.filter((u) => u.role === 'CHILD')

  function resetForm() {
    setTemplateId('')
    setAssignedToId('')
    setFrequency('DAILY')
    setDayOfWeek('1')
    setDayOfMonth('1')
    setFormError(null)
  }

  function cancelForm() {
    setShowForm(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!templateId || !assignedToId) {
      setFormError('Please select a template and assignee.')
      return
    }
    try {
      await createRecurringChore({
        templateId: parseInt(templateId, 10),
        userId: parseInt(assignedToId, 10),
        frequency,
        dayOfWeek: frequency === 'WEEKLY' ? parseInt(dayOfWeek, 10) : null,
        dayOfMonth: frequency === 'MONTHLY' ? parseInt(dayOfMonth, 10) : null,
      })
      cancelForm()
      setSuccessMessage('Recurring chore created!')
    } catch {
      setFormError('Failed to create recurring chore. Please try again.')
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteRecurringChore(id)
      setDeletingId(null)
      setSuccessMessage('Deleted.')
    } catch {
      setFormError('Failed to delete recurring chore.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading recurring chores...</span>
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
          <p className="text-gray-600 mb-4">Unable to load recurring chores. Check your connection and try again.</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recurring Chores</h2>
        <p className="text-gray-600 mb-6">
          Set up chores that repeat on a schedule. Daily, weekly, or monthly — assigned to a single family member.
        </p>

        {recurringChores.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <p className="text-lg font-bold text-gray-900 mb-1">No recurring chores yet</p>
            <p className="text-gray-600 mb-4">Create one above to get started.</p>
            <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover flex items-center gap-1 mx-auto">
              <Plus className="h-4 w-4" /> Create Recurring Chore
            </button>
          </div>
        ) : (
          <>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover mb-4 flex items-center gap-1">
                <Plus className="h-4 w-4" /> Create Recurring Chore
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-4">
                {formError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{formError}</div>}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="template" className="block text-sm font-normal text-gray-700 mb-1">Template</label>
                    <select id="template" value={templateId} onChange={e => setTemplateId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white" required>
                      <option value="">Select a chore template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.points} pts)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="frequency" className="block text-sm font-normal text-gray-700 mb-1">Frequency</label>
                    <select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white">
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  {frequency === 'WEEKLY' && (
                    <div>
                      <label htmlFor="dayOfWeek" className="block text-sm font-normal text-gray-700 mb-1">Day of Week</label>
                      <select id="dayOfWeek" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white">
                        {WEEKDAY_LABELS.map((label, i) => (
                          <option key={i} value={i}>{label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {frequency === 'MONTHLY' && (
                    <div>
                      <label htmlFor="dayOfMonth" className="block text-sm font-normal text-gray-700 mb-1">Day of Month</label>
                      <input id="dayOfMonth" type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                      <p className="text-xs text-gray-500 mt-1">If the month has fewer days, the chore will appear on the last day of the month.</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="assignedTo" className="block text-sm font-normal text-gray-700 mb-1">Assigned To</label>
                    <select id="assignedTo" value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white" required>
                      <option value="">Select a child...</option>
                      {childUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={isCreating} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50">
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={cancelForm} disabled={isCreating} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {recurringChores.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-12 px-4 py-3 border-b bg-gray-50 text-sm font-normal text-gray-500">
                  <div className="col-span-4">Template</div>
                  <div className="col-span-3">Frequency</div>
                  <div className="col-span-3">Assignee</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {recurringChores.map(chore => (
                  <div key={chore.id}>
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50">
                      <div className="col-span-4">
                        <div className="font-bold text-gray-900">{chore.template.title}</div>
                        <div className="text-sm text-gray-500">{chore.template.points} pts</div>
                      </div>
                      <div className="col-span-3 text-sm text-gray-600">
                        {frequencyDescription(chore)}
                      </div>
                      <div className="col-span-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chore.assignedTo.color }} />
                          {chore.assignedTo.name}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <button onClick={() => setDeletingId(chore.id)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete recurring chore">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {deletingId === chore.id && (
                      <div className="px-4 pb-3">
                        <ConfirmDelete
                          message="Delete this recurring chore? Pending occurrences will be removed. Completed occurrences are preserved for history."
                          deleteLabel="Delete"
                          keepLabel="Keep"
                          onDelete={() => handleDelete(chore.id)}
                          onCancel={() => setDeletingId(null)}
                          isDeleting={isDeleting}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
