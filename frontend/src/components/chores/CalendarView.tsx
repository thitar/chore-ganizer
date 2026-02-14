import { useState, useEffect } from 'react'
import { assignmentsApi } from '../../api/assignments.api'
import type { ChoreAssignment } from '../../types'
import { Loading } from '../common/Loading'

interface CalendarDay {
  day: number
  assignments: ChoreAssignment[]
  isToday: boolean
  isCurrentMonth: boolean
}

interface CalendarViewProps {
  onAssignmentClick?: (assignment: ChoreAssignment) => void
  refreshTrigger?: number
}

export default function CalendarView({ onAssignmentClick, refreshTrigger }: CalendarViewProps) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [calendarData, setCalendarData] = useState<{
    year: number
    month: number
    assignments: ChoreAssignment[]
    days: Record<number, ChoreAssignment[]>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCalendar()
  }, [year, month, refreshTrigger])

  const loadCalendar = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await assignmentsApi.getCalendar(year, month)
      setCalendarData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay()
  }

  const generateCalendarDays = (): CalendarDay[] => {
    if (!calendarData) return []

    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: CalendarDay[] = []
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    // Previous month days
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      days.push({
        day: dayNum,
        assignments: [],
        isToday: false,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        assignments: calendarData.days[day] || [],
        isToday: year === currentYear && month === currentMonth && day === currentDay,
        isCurrentMonth: true,
      })
    }

    // Next month days to fill the grid (6 rows x 7 days = 42)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        assignments: [],
        isToday: false,
        isCurrentMonth: false,
      })
    }

    return days
  }

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const goToToday = () => {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Error: {error}
      </div>
    )
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {monthNames[month - 1]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((calendarDay, index) => (
          <div
            key={index}
            className={`
              min-h-[80px] p-1 border rounded-lg
              ${calendarDay.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${calendarDay.isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
            `}
          >
            <div className={`
              text-sm font-medium mb-1
              ${calendarDay.isToday ? 'text-blue-600' : ''}
              ${!calendarDay.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
            `}>
              {calendarDay.day}
            </div>
            <div className="space-y-1">
              {calendarDay.assignments.slice(0, 2).map((assignment) => (
                <button
                  key={assignment.id}
                  onClick={() => onAssignmentClick?.(assignment)}
                  className={`
                    w-full text-xs p-1 rounded truncate text-left
                    ${assignment.isOverdue ? 'bg-red-100 text-red-800' : ''}
                    ${assignment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                    ${assignment.status === 'PENDING' && !assignment.isOverdue ? 'bg-yellow-100 text-yellow-800' : ''}
                  `}
                  title={`${assignment.choreTemplate.title} - ${assignment.assignedTo.name}`}
                >
                  {assignment.choreTemplate.title}
                </button>
              ))}
              {calendarDay.assignments.length > 2 && (
                <div className="text-xs text-gray-500 text-center">
                  +{calendarDay.assignments.length - 2} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
          <span>Completed</span>
        </div>
      </div>
    </div>
  )
}
