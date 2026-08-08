import { useEffect, useMemo, useRef, useState } from 'react'
import { useCalendarMonth } from '../hooks/useCalendar'
import { useUsers } from '../hooks/useUsers'
import { AppShell } from '../components/AppShell'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { assignmentKey } from '../utils/assignmentKey'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarDayAssignment {
  id: number
  type: 'REGULAR' | 'RECURRING'
  title: string
  description: string | null
  assignee: string
  color: string
  status: string
  points: number
}

interface DayCell {
  date: Date
  inMonth: boolean
  isToday: boolean
  assignments: CalendarDayAssignment[]
}

function buildCalendarDays(year: number, month: number, assignmentsByDate: Record<string, CalendarDayAssignment[]>): DayCell[] {
  const firstDay = new Date(year, month, 1)
  const startOfWeek = firstDay.getDay()
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

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(date)
}

export function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const { data: assignments, isLoading, error } = useCalendarMonth(year, month)
  const { users } = useUsers()

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, CalendarDayAssignment[]> = {}
    ;(assignments ?? []).forEach((a) => {
      const key = a.dueDate
      if (!map[key]) map[key] = []
      map[key].push({
        id: a.id,
        type: a.type,
        title: a.template.title,
        description: a.template.description,
        assignee: a.assignedTo.name,
        color: a.assignedTo.color,
        status: a.status,
        points: a.template.points,
      })
    })
    return map
  }, [assignments])

  const days = useMemo(() => buildCalendarDays(year, month, assignmentsByDate), [year, month, assignmentsByDate])

  useEffect(() => {
    if (selectedDay) dialogRef.current?.focus()
  }, [selectedDay])

  function openDay(day: DayCell, trigger: HTMLButtonElement) {
    triggerRef.current = trigger
    setSelectedDay(day)
  }

  function closeSelectedDay() {
    setSelectedDay(null)
    triggerRef.current?.focus()
  }

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
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h2 className="font-display text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-4">Unable to load calendar. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </AppShell>
    )
  }

  const totalInMonth = days.filter((d) => d.inMonth).reduce((sum, d) => sum + d.assignments.length, 0)

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <button onClick={goToToday} className="text-sm text-zinc-400 hover:text-zinc-100">Today</button>
          <Button variant="ghost" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <h2 className="font-display text-2xl font-bold text-zinc-100">{MONTH_NAMES[month]} {year}</h2>
        <div className="w-20" />
      </div>

      <div className="bg-surface rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-white/5 border-b border-edge">
          {DAY_HEADERS.map((day) => (
            <div key={day} className="px-2 py-3 text-center text-sm font-normal text-zinc-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6">
          {days.map((day, i) => (
            <button
              type="button"
              key={i}
              onClick={(event) => openDay(day, event.currentTarget)}
              aria-label={`View chores for ${formatLongDate(day.date)}`}
              className={`min-h-[90px] border-r border-b border-edge p-1 text-left ${
                day.inMonth ? 'bg-surface' : 'bg-surface opacity-40'
              } ${day.isToday ? 'ring-2 ring-accent ring-inset' : ''}`}
            >
              <div className={`text-sm font-normal mb-1 ${day.inMonth ? 'text-zinc-100' : 'text-zinc-500'}`}>
                {day.date.getDate()}
                {day.isToday && <span className="ml-1 text-xs text-accent font-bold">Today</span>}
              </div>
              <div className="space-y-0.5">
                {day.assignments.slice(0, 3).map((a) => (
                  <div
                    key={assignmentKey(a)}
                    className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${a.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}
                    style={{
                      backgroundColor: colorWithAlpha(a.color, 0.15),
                      color: a.color,
                    }}
                    title={a.title}
                  >
                    <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    {a.title}
                  </div>
                ))}
                {day.assignments.length > 3 && (
                  <div className="text-xs text-zinc-400">+{day.assignments.length - 3} more</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Chores for ${formatLongDate(selectedDay.date)}`}
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeSelectedDay()
              if (event.key !== 'Tab') return

              const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              )
              if (!focusableElements?.length) {
                event.preventDefault()
                dialogRef.current?.focus()
                return
              }

              const first = focusableElements[0]
              const last = focusableElements[focusableElements.length - 1]
              const activeElement = document.activeElement
              if (event.shiftKey && (activeElement === dialogRef.current || activeElement === first)) {
                event.preventDefault()
                last.focus()
              } else if (!event.shiftKey && (activeElement === dialogRef.current || activeElement === last)) {
                event.preventDefault()
                first.focus()
              }
            }}
            className="w-full max-w-md rounded-lg border border-edge bg-surface-raised p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="font-display text-xl font-bold text-zinc-100">Chores for {formatLongDate(selectedDay.date)}</h3>
              <button
                type="button"
                onClick={closeSelectedDay}
                aria-label={`Close chores for ${formatLongDate(selectedDay.date)}`}
                className="text-sm text-zinc-400 hover:text-zinc-100"
              >
                Close
              </button>
            </div>
            {selectedDay.assignments.length === 0 ? (
              <p className="text-zinc-400">No chores scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedDay.assignments.map((assignment) => (
                  <div key={assignmentKey(assignment)} className="rounded-lg bg-white/5 p-3">
                    <div className="font-bold text-zinc-100">{assignment.title}</div>
                    {assignment.description && (
                      <div className="text-sm text-zinc-500">{assignment.description}</div>
                    )}
                    <div className="text-sm text-zinc-400">{assignment.assignee}</div>
                    <div className={assignment.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}>
                      {assignment.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                    </div>
                    <div className="text-sm text-zinc-400">{assignment.points} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {totalInMonth === 0 && (
        <div className="mt-4 text-center text-zinc-400">
          No chores scheduled for {MONTH_NAMES[month]}.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {((users as Array<{ id: number; name: string; color: string }>) ?? []).map((u) => (
          <div key={u.id} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
            <span className="text-zinc-400">{u.name}</span>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
