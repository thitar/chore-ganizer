import { useState } from 'react'
import { CalendarClock, XCircle } from 'lucide-react'
import { useOverdue } from '../hooks/useOverdue'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import type { OverdueChore } from '../api/overdue.api'

function todayInputDate(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function OverdueChoreActions({
  chore,
  onAction,
}: {
  chore: OverdueChore
  onAction: (message: string) => void
}) {
  const { cancelChore, isCancelling, rescheduleChore, isRescheduling } = useOverdue()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [penalty, setPenalty] = useState('0')
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [newDueDate, setNewDueDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function openCancel() {
    setPenalty(String(chore.template.points))
    setFormError(null)
    setCancelOpen(true)
  }

  function openReschedule() {
    setNewDueDate(todayInputDate())
    setFormError(null)
    setRescheduleOpen(true)
  }

  async function handleCancel() {
    setFormError(null)
    try {
      const value = Math.min(100000, Math.max(0, Math.floor(Number(penalty) || 0)))
      await cancelChore(chore.id, chore.type, value)
      setCancelOpen(false)
      onAction(value > 0 ? `Chore canceled, ${value} pts penalty applied.` : 'Chore canceled.')
    } catch {
      setFormError('Failed to cancel chore. Please try again.')
    }
  }

  async function handleReschedule() {
    setFormError(null)
    try {
      await rescheduleChore(chore.id, newDueDate)
      setRescheduleOpen(false)
      onAction('Due date updated.')
    } catch {
      setFormError('Failed to reschedule chore. Please try again.')
    }
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button variant="danger" onClick={openCancel}>
          <XCircle className="h-4 w-4" aria-hidden /> Cancel
        </Button>
        {chore.type === 'REGULAR' && (
          <Button variant="secondary" onClick={openReschedule}>
            <CalendarClock className="h-4 w-4" aria-hidden /> Reschedule
          </Button>
        )}
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel overdue chore">
        {cancelOpen && (
          <div>
            {formError && <div className="alert-error mb-4">{formError}</div>}
            <p className="mb-1 text-sm text-zinc-300">Penalty for {chore.assignedTo.name} (0 to waive):</p>
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
              <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={isCancelling}>
                Keep Chore
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule overdue chore">
        {rescheduleOpen && (
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
              <Button variant="secondary" onClick={() => setRescheduleOpen(false)} disabled={isRescheduling}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
