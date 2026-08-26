import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useOverdue } from '../hooks/useOverdue'
import { useLeaderboard, useWeeklyPoints } from '../hooks/usePoints'
import { useNudge } from '../hooks/useNudge'
import { formatDueDate } from '../utils/dateFormat'
import { assignmentKey } from '../utils/assignmentKey'
import { Leaderboard } from '../components/Leaderboard'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'
import { OverdueChoreActions } from '../components/OverdueChoreActions'
import { AssignChoreForm } from '../components/AssignChoreForm'

type ActionChore = {
  id: number
  type: 'REGULAR' | 'RECURRING'
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  status: 'PENDING'
  template: { id: number; title: string; points: number; category: string | null }
  assignedTo: { id: number; name: string; color: string; ntfyTopic: string | null }
}

function startOfWeek(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - day)
  return monday
}

function isTodayUTC(dateStr: string): boolean {
  const now = new Date()
  const due = new Date(dateStr)
  return (
    due.getUTCFullYear() === now.getUTCFullYear() &&
    due.getUTCMonth() === now.getUTCMonth() &&
    due.getUTCDate() === now.getUTCDate()
  )
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const hours = Math.max(1, Math.round((Date.now() - then) / 3600000))
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

function extractErrorMessage(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
    if (data) return data
  }
  return null
}

export function ParentDashboard() {
  const { user } = useAuth()
  const { assignments, isLoading: isLoadingAssignments, completeAssignment, isCompleting } = useAssignments()
  const { overdue, isLoading: isLoadingOverdue } = useOverdue()
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard()
  const { data: weeklyPoints, isLoading: isLoadingWeekly } = useWeeklyPoints()
  const { mutateAsync: nudgeAsync, isPending: isNudging } = useNudge()

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const needsAction = useMemo<ActionChore[]>(() => {
    const todayPending: ActionChore[] = assignments
      .filter(a => a.status === 'PENDING' && isTodayUTC(a.dueDate))
      .map(a => ({
        id: a.id,
        type: a.type ?? 'REGULAR',
        choreTemplateId: a.choreTemplateId,
        assignedToId: a.assignedToId,
        dueDate: a.dueDate,
        status: 'PENDING' as const,
        template: a.template,
        assignedTo: a.assignedTo,
      }))
    const merged = [...todayPending, ...overdue]
    const seen = new Set<string>()
    return merged
      .filter(c => {
        const key = assignmentKey(c)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => {
        const aOverdue = formatDueDate(a.dueDate).isOverdue ? 0 : 1
        const bOverdue = formatDueDate(b.dueDate).isOverdue ? 0 : 1
        return aOverdue - bOverdue || a.dueDate.localeCompare(b.dueDate)
      })
      .slice(0, 5)
  }, [assignments, overdue])

  const week = useMemo(() => {
    const now = new Date()
    const monday = startOfWeek(now)
    const nextMonday = new Date(monday)
    nextMonday.setUTCDate(monday.getUTCDate() + 7)
    const thisWeek = assignments.filter(a => {
      const due = new Date(a.dueDate)
      return due >= monday && due < nextMonday
    })
    return {
      total: thisWeek.length,
      done: thisWeek.filter(a => a.status === 'COMPLETED').length,
    }
  }, [assignments])

  const dueToday = useMemo(
    () => assignments.filter(a => a.status === 'PENDING' && isTodayUTC(a.dueDate)).length,
    [assignments]
  )

  const weeklyTotal = useMemo(
    () => (weeklyPoints ?? []).reduce((sum, e) => sum + e.points, 0),
    [weeklyPoints]
  )

  const latestWins = useMemo(
    () =>
      assignments
        .filter(a => a.status === 'COMPLETED' && a.completedAt !== null)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
        .slice(0, 3),
    [assignments]
  )

  async function handleNudge(chore: ActionChore) {
    try {
      await nudgeAsync({ id: chore.id, type: chore.type })
      setToast({ kind: 'success', text: `Reminder sent to ${chore.assignedTo.name} 👀` })
    } catch (err) {
      setToast({ kind: 'error', text: extractErrorMessage(err) ?? 'Failed to send reminder. Please try again.' })
    }
  }

  async function handleComplete(chore: ActionChore) {
    try {
      await completeAssignment(chore.id, chore.type)
      setToast({ kind: 'success', text: `Chore marked complete for ${chore.assignedTo.name}! 🎉` })
    } catch {
      setToast({ kind: 'error', text: 'Failed to complete chore. Please try again.' })
    }
  }

  const isLoading = isLoadingAssignments || isLoadingOverdue || isLoadingWeekly || isLeaderboardLoading

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-zinc-100">Hey {user?.name} 👋</h2>
        <Button onClick={() => setShowAssignModal(true)} className="mt-3 w-full justify-center">
          <Plus className="h-4 w-4" /> Assign Chore
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Overdue">
          <CountUp value={overdue.length} />
        </StatCard>
        <StatCard label="Due today">
          <CountUp value={dueToday} />
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
        <StatCard label="Pts this week">
          <CountUp value={weeklyTotal} />
        </StatCard>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Needs action</h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : needsAction.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up 🎉" hint="Nothing needs your attention right now." />
          ) : (
            <div className="space-y-3">
              {needsAction.map(chore => {
                const { label, isOverdue } = formatDueDate(chore.dueDate)
                const canNudge = chore.assignedTo.ntfyTopic !== null
                return (
                  <Card
                    key={assignmentKey(chore)}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={chore.assignedTo.name} color={chore.assignedTo.color} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-100">{chore.template.title}</div>
                        <div className="text-sm text-zinc-400">
                          {chore.assignedTo.name} ·{' '}
                          <span className={isOverdue ? 'font-bold text-rose-400' : ''}>
                            {isOverdue ? 'Overdue' : label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {isOverdue && (
                        <OverdueChoreActions
                          chore={chore}
                          onAction={msg => setToast({ kind: 'success', text: msg })}
                          onError={msg => setToast({ kind: 'error', text: msg })}
                        />
                      )}
                      {!isOverdue && (
                        <Button onClick={() => handleComplete(chore)} loading={isCompleting}>
                          <CheckCircle2 className="h-4 w-4" aria-hidden /> Mark Complete
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => handleNudge(chore)}
                        disabled={!canNudge || isNudging}
                        title={canNudge ? undefined : 'This child has not enabled push notifications'}
                      >
                        Nudge
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div>
            <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Leaderboard</h3>
            {leaderboard && leaderboard.length > 0 ? (
              <Leaderboard entries={leaderboard} limit={3} />
            ) : (
              <p className="text-sm text-zinc-500">No points earned yet.</p>
            )}
          </div>
          <div>
            <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Latest win</h3>
            {latestWins.length === 0 ? (
              <p className="text-sm text-zinc-500">No chores completed yet.</p>
            ) : (
              <div className="space-y-3">
                {latestWins.map(a => (
                  <Card key={assignmentKey(a)} className="flex items-center gap-3">
                    <Avatar name={a.assignedTo.name} color={a.assignedTo.color} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-100">{a.template.title}</div>
                      <div className="text-sm text-zinc-400">
                        {a.assignedTo.name} · +{a.pointsAwarded ?? a.template.points} pts · {a.completedAt ? timeAgo(a.completedAt) : ''}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Chore">
        {showAssignModal && (
          <AssignChoreForm
            onSuccess={() => { setShowAssignModal(false); setToast({ kind: 'success', text: 'Assignment created!' }) }}
            onCancel={() => setShowAssignModal(false)}
          />
        )}
      </Modal>

      {toast && <Toast kind={toast.kind}>{toast.text}</Toast>}
    </div>
  )
}
