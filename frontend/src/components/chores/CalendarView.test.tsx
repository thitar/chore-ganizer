import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import CalendarView from './CalendarView'
import { assignmentsApi } from '../../api/assignments.api'
import type { Mock } from 'vitest'

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

describe('CalendarView — avatar indicators', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows one avatar per unique member with chores on a day', async () => {
    ;(assignmentsApi.getCalendar as Mock).mockResolvedValue({
      assignments: [
        {
          id: 1,
          choreTemplate: { id: 1, title: 'Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-07T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
        {
          id: 2,
          choreTemplate: { id: 2, title: 'Trash', points: 5 },
          assignedTo: { id: 3, name: 'Bob', color: '#f97316' },
          dueDate: '2026-03-07T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
      ],
      year: 2026, month: 3, days: {},
    })

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    expect(screen.getByTitle('Alice')).toBeInTheDocument()
    expect(screen.getByTitle('Bob')).toBeInTheDocument()
  })

  it('shows overdue outline on avatar when member has an overdue chore', async () => {
    ;(assignmentsApi.getCalendar as Mock).mockResolvedValue({
      assignments: [
        {
          id: 1,
          choreTemplate: { id: 1, title: 'Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-05T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: true,
        },
      ],
      year: 2026, month: 3, days: {},
    })

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const avatar = screen.getByTitle('Alice — overdue')
    expect(avatar).toBeInTheDocument()
  })
})
