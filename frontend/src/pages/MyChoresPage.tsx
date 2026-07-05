import { useState, useMemo, useEffect } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useAuth } from '../hooks/useAuth'
import { FilterBar } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { Toast } from '../components/ui/Toast'
import { celebrate } from '../lib/celebrate'
import { CheckCircle2, ClipboardList } from 'lucide-react'

function currentMonthDates(): { from: string; to: string } {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const to = lastDay.toISOString().split('T')[0]
  return { from, to }
}

export function MyChoresPage() {
  const { user } = useAuth()
  const {
    assignments,
    isLoading,
    error,
    completeAssignment,
    isCompleting,
  } = useAssignments()

  const initialDates = currentMonthDates()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(initialDates.from)
  const [dateTo, setDateTo] = useState(initialDates.to)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [completeError, setCompleteError] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  function clearFilters() {
    setStatusFilter('all')
    const { from, to } = currentMonthDates()
    setDateFrom(from)
    setDateTo(to)
  }

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter.toUpperCase()) return false
      if (dateFrom && a.dueDate < dateFrom) return false
      if (dateTo && a.dueDate > dateTo) return false
      return true
    })
  }, [assignments, statusFilter, dateFrom, dateTo])

  async function handleComplete(id: number, type?: 'REGULAR' | 'RECURRING') {
    setCompleteError(null)
    try {
      await completeAssignment(id, type)
      celebrate()
      setSuccessMessage('Chore marked complete! 🎉')
    } catch {
      setCompleteError('Failed to complete chore.')
    }
  }

  function formatDate(dateStr: string): { label: string; isOverdue: boolean; isToday: boolean } {
    const date = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const label = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`

    return {
      label,
      isOverdue: dueDate < today,
      isToday: dueDate.getTime() === today.getTime(),
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="mb-4 text-zinc-400">Unable to load your chores. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="My Chores" />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No chores assigned yet"
          hint="A parent needs to assign a chore before it appears here."
        />
      ) : (
        <>
          <FilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            onClear={clearFilters}
          />

          {filtered.length === 0 ? (
            <div className="py-8 text-center text-zinc-400">
              No assignments match your filters.{' '}
              <button onClick={clearFilters} className="text-accent hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filtered.map(assignment => {
                const { label: dueDateLabel, isOverdue, isToday } = formatDate(assignment.dueDate)
                const overdue = isOverdue && assignment.status === 'PENDING'
                const completed = assignment.status === 'COMPLETED'
                return (
                  <Card
                    key={assignment.id}
                    className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                      overdue ? 'border-rose-500/40' : ''
                    } ${completed ? 'opacity-60' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className={`font-bold text-zinc-100 ${completed ? 'line-through decoration-zinc-500' : ''}`}>
                        {assignment.template.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                        {assignment.template.category && <span>{assignment.template.category}</span>}
                        <span className={overdue ? 'font-bold text-rose-400' : ''}>
                          {isToday ? 'Today' : dueDateLabel}
                        </span>
                        <StatusBadge status={assignment.status} overdue={overdue} />
                        <span className="font-display font-bold text-accent">{assignment.template.points} pts</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {assignment.status === 'PENDING' ? (
                        <Button
                          onClick={() => handleComplete(assignment.id, assignment.type)}
                          loading={isCompleting}
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          {isCompleting ? 'Completing...' : 'Mark Complete'}
                        </Button>
                      ) : (
                        <span className="text-sm text-zinc-500">Completed</span>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
      {completeError && <Toast kind="error">{completeError}</Toast>}
    </AppShell>
  )
}
