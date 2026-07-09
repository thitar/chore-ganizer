import { useMemo } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { formatDueDate } from '../utils/dateFormat'
import { useAssignments } from '../hooks/useAssignments'
import { useMyPoints, useLeaderboard, useGamification } from '../hooks/usePoints'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { Leaderboard } from '../components/Leaderboard'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'

export function DashboardPage() {
  const { user } = useAuth()
  const { assignments, isLoading, error } = useAssignments()
  const { data: myPoints } = useMyPoints()
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard()
  const { data: gamification } = useGamification()

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
      <div className="mb-6 flex items-center gap-3">
        <h2 className="font-display text-2xl font-bold text-zinc-100">Hey {user?.name} 👋</h2>
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
                  <Card key={`${assignment.type}-${assignment.id}`} className="flex items-center justify-between">
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
    </AppShell>
  )
}
