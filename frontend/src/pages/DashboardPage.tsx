import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { NavBar } from '../components/NavBar'
import { StatusBadge } from '../components/StatusBadge'

export function DashboardPage() {
  const { user } = useAuth()
  const { assignments, isLoading, error } = useAssignments()

  const upcoming = useMemo(() => {
    if (!user || !assignments.length) return []
    return assignments
      .filter(a => a.assignedToId === user.id && a.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [assignments, user])

  function formatDueDate(dateStr: string): { label: string; isOverdue: boolean; isToday: boolean; isTomorrow: boolean } {
    const date = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    let label: string
    if (dueDate.getTime() === today.getTime()) {
      label = 'Today'
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      label = 'Tomorrow'
    } else if (diffDays > 0 && diffDays <= 6) {
      label = `in ${diffDays} days`
    } else {
      label = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
    }

    return {
      label,
      isOverdue: dueDate < today,
      isToday: dueDate.getTime() === today.getTime(),
      isTomorrow: dueDate.getTime() === tomorrow.getTime(),
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Welcome, {user?.name}!</h2>

        <h2 className="text-base font-bold text-gray-900 mb-4">Upcoming Chores</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <p className="text-red-600 text-sm">Unable to load upcoming chores.</p>
        ) : upcoming.length === 0 ? (
          <p className="text-gray-500">No upcoming chores. Enjoy your free time!</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(assignment => {
              const { label: dueLabel, isOverdue } = formatDueDate(assignment.dueDate)
              return (
                <div key={assignment.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{assignment.template.title}</div>
                    <div className="text-sm text-gray-500">
                      {assignment.template.category && `${assignment.template.category} · `}
                      <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                        {isOverdue ? 'Overdue' : dueLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={assignment.status} overdue={isOverdue} />
                    <span className="text-sm text-gray-500">{assignment.template.points} pts</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
