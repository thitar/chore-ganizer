import { useState, useEffect } from 'react'
import { useRecurringChores } from '../hooks/useRecurringChores'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
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
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="ml-3 text-zinc-400">Loading recurring chores...</span>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="font-display text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-4">Unable to load recurring chores. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Recurring Chores" />
      <p className="text-zinc-400 mb-6">
        Set up chores that repeat on a schedule. Daily, weekly, or monthly — assigned to a single family member.
      </p>

      {recurringChores.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-lg font-bold text-zinc-100 mb-1">No recurring chores yet</p>
          <p className="text-zinc-400 mb-4">Create one above to get started.</p>
          <Button onClick={() => setShowForm(true)} className="mx-auto">
            <Plus className="h-4 w-4" /> Create Recurring Chore
          </Button>
        </div>
      ) : (
        <>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="mb-4">
              <Plus className="h-4 w-4" /> Create Recurring Chore
            </Button>
          )}

          {showForm && (
            <Card className="p-6 mb-4">
              {formError && <div className="alert-error mb-4">{formError}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="template" className="block text-sm font-normal text-zinc-400 mb-1">Template</label>
                  <select id="template" value={templateId} onChange={e => setTemplateId(e.target.value)} className="input" required>
                    <option value="">Select a chore template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.points} pts)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="frequency" className="block text-sm font-normal text-zinc-400 mb-1">Frequency</label>
                  <select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')} className="input">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                {frequency === 'WEEKLY' && (
                  <div>
                    <label htmlFor="dayOfWeek" className="block text-sm font-normal text-zinc-400 mb-1">Day of Week</label>
                    <select id="dayOfWeek" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="input">
                      {WEEKDAY_LABELS.map((label, i) => (
                        <option key={i} value={i}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {frequency === 'MONTHLY' && (
                  <div>
                    <label htmlFor="dayOfMonth" className="block text-sm font-normal text-zinc-400 mb-1">Day of Month</label>
                    <input id="dayOfMonth" type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} className="input" required />
                    <p className="text-xs text-zinc-500 mt-1">If the month has fewer days, the chore will appear on the last day of the month.</p>
                  </div>
                )}
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-normal text-zinc-400 mb-1">Assigned To</label>
                  <select id="assignedTo" value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="input" required>
                    <option value="">Select a child...</option>
                    {childUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" loading={isCreating} onClick={handleSubmit}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelForm} disabled={isCreating}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {recurringChores.length > 0 && (
            <Card>
              <div className="grid grid-cols-12 px-4 py-3 border-b border-edge bg-white/5 text-sm font-normal text-zinc-400">
                <div className="col-span-4">Template</div>
                <div className="col-span-3">Frequency</div>
                <div className="col-span-3">Assignee</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {recurringChores.map(chore => (
                <div key={chore.id}>
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-white/5">
                    <div className="col-span-4">
                      <div className="font-bold text-zinc-100">{chore.template.title}</div>
                      <div className="text-sm text-zinc-400">{chore.template.points} pts</div>
                    </div>
                    <div className="col-span-3 text-sm text-zinc-400">
                      {frequencyDescription(chore)}
                    </div>
                    <div className="col-span-3 text-sm text-zinc-400">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chore.assignedTo.color }} />
                        {chore.assignedTo.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <button onClick={() => setDeletingId(chore.id)} className="p-1 text-zinc-500 hover:text-rose-400" aria-label="Delete recurring chore">
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
            </Card>
          )}
        </>
      )}

      {successMessage && (
        <Toast kind="success">{successMessage}</Toast>
      )}
    </AppShell>
  )
}
