import { useState, useEffect } from 'react'
import { assignmentsApi } from '../../api/assignments.api'
import type { ChoreAssignment } from '../../types'
import { Loading } from '../common/Loading'

interface CalendarDay {
  day: number
  date: Date
  assignments: ChoreAssignment[]
  isToday: boolean
  isCurrentMonth: boolean
}

interface CalendarViewProps {
  onAssignmentClick?: (assignment: ChoreAssignment) => void
  onDateClick?: (date: Date) => void
  refreshTrigger?: number
}

/**
 * Get contrasting text color (black or white) based on background color
 */
function getContrastColor(hexColor: string | null): string {
  const defaultColor = '#3B82F6'
  const hex = hexColor || defaultColor
  
  // Remove # if present
  const hexValue = hex.replace('#', '')
  
  // Parse RGB values
  const r = parseInt(hexValue.substring(0, 2), 16)
  const g = parseInt(hexValue.substring(2, 4), 16)
  const b = parseInt(hexValue.substring(4, 6), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

/**
 * Get border color based on assignment status
 */
function getStatusBorderColor(status: string, isOverdue: boolean): string {
  if (isOverdue) return '#EF4444' // red-500
  switch (status) {
    case 'COMPLETED': return '#22C55E' // green-500
    case 'PARTIALLY_COMPLETE': return '#F97316' // orange-500
    case 'PENDING':
    default: return '#EAB308' // yellow-500
  }
}

export default function CalendarView({ onAssignmentClick, onDateClick, refreshTrigger }: CalendarViewProps) {
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
        date: new Date(prevYear, prevMonth - 1, dayNum),
        assignments: [],
        isToday: false,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        date: new Date(year, month - 1, day),
        assignments: calendarData.days[day] || [],
        isToday: year === currentYear && month === currentMonth && day === currentDay,
        isCurrentMonth: true,
      })
    }

    // Next month days to fill the grid (6 rows x 7 days = 42)
    const remainingDays = 42 - days.length
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        date: new Date(nextYear, nextMonth - 1, day),
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

  const handleDateClick = (calendarDay: CalendarDay) => {
    if (calendarDay.isCurrentMonth && calendarDay.assignments.length === 0 && onDateClick) {
      onDateClick(calendarDay.date)
    }
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
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
            onClick={() => handleDateClick(calendarDay)}
            className={`
              min-h-[80px] p-1 border rounded-lg
              ${calendarDay.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${calendarDay.isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
              ${calendarDay.isCurrentMonth && calendarDay.assignments.length === 0 && onDateClick ? 'cursor-pointer hover:bg-gray-50' : ''}
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
              {calendarDay.assignments.slice(0, 2).map((assignment) => {
                const bgColor = assignment.assignedTo.color || '#3B82F6'
                const textColor = getContrastColor(assignment.assignedTo.color)
                const borderColor = getStatusBorderColor(assignment.status, assignment.isOverdue)
                
                return (
                  <button
                    key={assignment.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAssignmentClick?.(assignment)
                    }}
                    className="w-full text-xs py-1.5 px-2 rounded truncate text-left font-medium border-l-8"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      borderLeftColor: borderColor,
                    }}
                    title={`${assignment.choreTemplate.title} - ${assignment.assignedTo.name}`}
                  >
                    {assignment.choreTemplate.title}
                  </button>
                )
              })}
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
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded"></span>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded"></span>
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-orange-500 rounded"></span>
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded"></span>
          <span>Completed</span>
        </div>
      </div>
    </div>
  )
}
