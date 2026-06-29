import { useState, useMemo, useEffect } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useAuth } from '../hooks/useAuth'
import { NavBar } from '../components/NavBar'
import { FilterBar } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { CheckCircle2 } from 'lucide-react'

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
      setSuccessMessage('Chore marked complete!')
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
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading your chores...</span>
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
          <p className="text-gray-600 mb-4">Unable to load your chores. Check your connection and try again.</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Chores</h2>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-bold text-gray-900 mb-1">No chores assigned yet</p>
            <p className="text-gray-600">A parent needs to assign a chore before it appears here.</p>
          </div>
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
              <div className="text-center py-8 text-gray-500">
                No assignments match your filters.{' '}
                <button onClick={clearFilters} className="text-primary hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm mt-4">
                <div className="grid grid-cols-4 px-4 py-3 border-b bg-gray-50 text-sm font-normal text-gray-500">
                  <div>Chore</div>
                  <div>Due Date</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>
                {filtered.map(assignment => {
                  const { label: dueDateLabel, isOverdue, isToday } = formatDate(assignment.dueDate)

                  return (
                    <div key={assignment.id} className={`grid grid-cols-4 gap-4 px-4 py-3 items-center${assignment.status === 'COMPLETED' ? ' bg-green-50' : ''}`}>
                      <div>
                        <div className="font-bold text-gray-900">{assignment.template.title}</div>
                        {assignment.template.category && <div className="text-sm text-gray-500">{assignment.template.category}</div>}
                      </div>
                      <div className={isOverdue && assignment.status === 'PENDING' ? 'text-red-600 font-bold' : 'text-gray-600'}>
                        {isToday ? 'Today' : dueDateLabel}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={assignment.status} overdue={isOverdue && assignment.status === 'PENDING'} />
                        <span className="text-sm text-gray-500">{assignment.template.points} pts</span>
                      </div>
                      <div>
                        {assignment.status === 'PENDING' ? (
                          <button
                            onClick={() => handleComplete(assignment.id, assignment.type)}
                            disabled={isCompleting}
                            className="bg-primary text-white text-sm px-3 py-1 rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {isCompleting ? 'Completing...' : 'Mark Complete'}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">Completed</span>
                        )}
                      </div>
                    </div>
                  )
                })}
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
      {completeError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 text-red-600 px-4 py-2 rounded-lg shadow-md">
          {completeError}
        </div>
      )}
    </div>
  )
}
