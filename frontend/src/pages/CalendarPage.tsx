import { useState, useMemo } from 'react'
import { useCalendarMonth } from '../hooks/useCalendar'
import { useUsers } from '../hooks/useUsers'
import { NavBar } from '../components/NavBar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayCell {
  date: Date
  inMonth: boolean
  isToday: boolean
  assignments: Array<{ id: number; title: string; color: string; status: string }>
}

function buildCalendarDays(year: number, month: number, assignmentsByDate: Record<string, Array<{ id: number; title: string; color: string; status: string }>>): DayCell[] {
  const firstDay = new Date(year, month, 1)
  const startOfWeek = firstDay.getDay() // 0 = Sunday
  const startDate = new Date(year, month, 1 - startOfWeek)

  const days: DayCell[] = []
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const cellKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    days.push({
      date: d,
      inMonth: d.getMonth() === month,
      isToday: cellKey === todayKey,
      assignments: assignmentsByDate[key] ?? [],
    })
  }
  return days
}

function colorWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return hex
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const { data: assignments, isLoading, error } = useCalendarMonth(year, month)
  const { users } = useUsers()

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Array<{ id: number; title: string; color: string; status: string }>> = {}
    ;(assignments ?? []).forEach((a) => {
      const key = a.dueDate
      if (!map[key]) map[key] = []
      map[key].push({
        id: a.id,
        title: a.template.title,
        color: a.assignedTo.color,
        status: a.status,
      })
    })
    return map
  }, [assignments])

  const days = useMemo(() => buildCalendarDays(year, month, assignmentsByDate), [year, month, assignmentsByDate])

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1)
      setMonth(11)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear(year + 1)
      setMonth(0)
    } else {
      setMonth(month + 1)
    }
  }

  function goToToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading calendar...</span>
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
          <p className="text-gray-600 mb-4">Unable to load calendar. Check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover">
            Try again
          </button>
        </div>
      </div>
    )
  }

  const totalInMonth = days.filter((d) => d.inMonth).reduce((sum, d) => sum + d.assignments.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToToday} className="text-sm text-gray-500 hover:text-gray-700">Today</button>
            <button onClick={nextMonth} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg" aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{MONTH_NAMES[month]} {year}</h2>
          <div className="w-20" />
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {DAY_HEADERS.map((day) => (
              <div key={day} className="px-2 py-3 text-center text-sm font-normal text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6">
            {days.map((day, i) => (
              <div
                key={i}
                className={`min-h-[90px] border-r border-b p-1 ${
                  day.inMonth ? 'bg-white' : 'bg-gray-50'
                } ${day.isToday ? 'bg-primary-light' : ''}`}
              >
                <div className={`text-sm font-normal mb-1 ${day.inMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {day.date.getDate()}
                  {day.isToday && <span className="ml-1 text-xs text-primary font-bold">Today</span>}
                </div>
                <div className="space-y-0.5">
                  {day.assignments.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className={`text-xs px-1 py-0.5 rounded truncate ${a.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}
                      style={{
                        backgroundColor: colorWithAlpha(a.color, 0.15),
                        color: a.color,
                      }}
                      title={a.title}
                    >
                      {a.title}
                    </div>
                  ))}
                  {day.assignments.length > 3 && (
                    <div className="text-xs text-gray-500">+{day.assignments.length - 3} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalInMonth === 0 && (
          <div className="mt-4 text-center text-gray-500">
            No chores scheduled for {MONTH_NAMES[month]}.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {((users as Array<{ id: number; name: string; color: string }>) ?? []).map((u) => (
            <div key={u.id} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-gray-600">{u.name}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
