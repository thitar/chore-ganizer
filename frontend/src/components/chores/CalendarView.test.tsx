import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import CalendarView from './CalendarView'

vi.mock('../../api/assignments.api', () => ({
  assignmentsApi: {
    getCalendar: vi.fn().mockResolvedValue({ assignments: [], year: 2026, month: 2, days: {} }),
  },
}))

vi.mock('../../api/recurring-chores.api', () => ({
  recurringChoresApi: {
    listOccurrences: vi.fn().mockResolvedValue([]),
  },
}))

describe('CalendarView — month grid row count', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 4 rows for February 2026 (starts Sunday, 28 days)', async () => {
    // Feb 1 2026 is a Sunday: firstDay=0, daysInMonth=28 → ceil((0+28)/7)=4 rows → 28 day cells
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-02-15T12:00:00'))

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const dayCells = document.querySelectorAll('[data-testid="cal-cell"]')
    expect(dayCells).toHaveLength(28)
  })

  it('renders 5 rows for March 2026 (starts Sunday, 31 days)', async () => {
    // Mar 1 2026 is a Sunday: firstDay=0, daysInMonth=31 → ceil((0+31)/7)=5 rows → 35 cells
    // 31 current-month + 4 next-month overflow = 35
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const dayCells = document.querySelectorAll('[data-testid="cal-cell"]')
    expect(dayCells).toHaveLength(35)
  })

  it('renders 6 rows for May 2026 (starts Friday, 31 days)', async () => {
    // May 1 2026 is a Friday: firstDay=5, daysInMonth=31 → ceil((5+31)/7)=ceil(5.14)=6 rows → 42 cells
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-15T12:00:00'))

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const dayCells = document.querySelectorAll('[data-testid="cal-cell"]')
    expect(dayCells).toHaveLength(42)
  })
})
