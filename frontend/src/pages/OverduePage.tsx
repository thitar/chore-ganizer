import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useOverdue } from '../hooks/useOverdue'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { OverdueChoreActions } from '../components/OverdueChoreActions'
import { daysOverdue } from '../utils/dateFormat'

export function OverduePage() {
  const { overdue, isLoading, error } = useOverdue()

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
              <OverdueChoreActions chore={chore} onAction={setSuccessMessage} />
            </Card>
          ))}
        </div>
      )}

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
    </AppShell>
  )
}
