import { useMemo, useState, useEffect } from 'react'
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { useOverdue } from '../hooks/useOverdue'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { daysOverdue } from '../utils/dateFormat'
import type { OverdueChore } from '../api/overdue.api'

function todayInputDate(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function OverduePage() {
  const { overdue, isLoading, error, cancelChore, isCancelling, rescheduleChore, isRescheduling } = useOverdue()

  const [cancelTarget, setCancelTarget] = useState<OverdueChore | null>(null)
  const [penalty, setPenalty] = useState('0')
  const [rescheduleTarget, setRescheduleTarget] = useState<OverdueChore | null>(null)
  const [newDueDate, setNewDueDate] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const sorted = useMemo(
    () => [...overdue].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [overdue]
  )

  function openCancel(chore: OverdueChore) {
    setPenalty(String(chore.template.points))
    setFormError(null)
    setCancelTarget(chore)
  }

  function openReschedule(chore: OverdueChore) {
    setNewDueDate(todayInputDate())
    setFormError(null)
    setRescheduleTarget(chore)
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setFormError(null)
    try {
      const value = Math.min(100000, Math.max(0, Math.floor(Number(penalty) || 0)))
      await cancelChore(cancelTarget.id, cancelTarget.type, value)
      setCancelTarget(null)
      setSuccessMessage(value > 0 ? `Chore canceled, ${value} pts penalty applied.` : 'Chore canceled.')
    } catch {
      setFormError('Failed to cancel chore. Please try again.')
    }
  }

  async function handleReschedule() {
    if (!rescheduleTarget) return
    setFormError(null)
    try {
      await rescheduleChore(rescheduleTarget.id, newDueDate)
      setRescheduleTarget(null)
      setSuccessMessage('Due date updated.')
    } catch {
      setFormError('Failed to reschedule chore. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="mb-4 text-zinc-400">Unable to load overdue chores. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Overdue Chores" />

      {sorted.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing overdue" hint="All chores are on time. Nice!" />
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map(chore => (
            <Card
              key={`${chore.type}-${chore.id}`}
              className="flex flex-col gap-3 border-rose-500/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-bold text-zinc-100">{chore.template.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                  <span>{chore.assignedTo.name}</span>
                  <span className="font-bold text-rose-400">Overdue {daysOverdue(chore.dueDate)} days</span>
                  <span className="font-display font-bold text-accent">{chore.template.points} pts</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="danger" onClick={() => openCancel(chore)}>
                  <XCircle className="h-4 w-4" aria-hidden /> Cancel
                </Button>
                {chore.type === 'REGULAR' && (
                  <Button variant="secondary" onClick={() => openReschedule(chore)}>
                    <CalendarClock className="h-4 w-4" aria-hidden /> Reschedule
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={cancelTarget !== null} onClose={() => setCancelTarget(null)} title="Cancel overdue chore">
        {cancelTarget && (
          <div>
            {formError && <div className="alert-error mb-4">{formError}</div>}
            <p className="mb-1 text-sm text-zinc-300">
              Penalty for {cancelTarget.assignedTo.name} (0 to waive):
            </p>
            <input
              type="number"
              min="0"
              max="100000"
              value={penalty}
              onChange={e => setPenalty(e.target.value)}
              className="input"
              aria-label="Penalty points"
            />
            <p className="mt-1 text-sm text-zinc-500">Default is the chore&apos;s point value.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" onClick={handleCancel} loading={isCancelling}>
                Cancel Chore
              </Button>
              <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={isCancelling}>
                Keep Chore
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={rescheduleTarget !== null} onClose={() => setRescheduleTarget(null)} title="Reschedule overdue chore">
        {rescheduleTarget && (
          <div>
            {formError && <div className="alert-error mb-4">{formError}</div>}
            <label htmlFor="newDueDate" className="mb-1 block text-sm font-normal text-zinc-300">
              New due date
            </label>
            <input
              id="newDueDate"
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="input"
              required
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleReschedule} loading={isRescheduling} disabled={newDueDate === ''}>
                Save Date
              </Button>
              <Button variant="secondary" onClick={() => setRescheduleTarget(null)} disabled={isRescheduling}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
    </AppShell>
  )
}
