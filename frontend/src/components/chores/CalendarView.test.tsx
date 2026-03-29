import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test/utils'
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

  it('shows only one avatar when a member has multiple chores on the same day', async () => {
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
          choreTemplate: { id: 2, title: 'Vacuum', points: 15 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-07T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
      ],
      year: 2026, month: 3, days: {},
    })

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // Alice has two chores on March 7 but should only show one avatar
    expect(screen.getAllByTitle('Alice')).toHaveLength(1)
  })
})

describe('CalendarView — day detail panel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))
    ;(assignmentsApi.getCalendar as Mock).mockResolvedValue({
      assignments: [
        {
          id: 1,
          choreTemplate: { id: 1, title: 'Dishes', points: 15 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-15T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
      ],
      year: 2026, month: 3, days: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows detail panel when a day is clicked', async () => {
    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // Mar 15 2026: firstDay=0 (Sun), so cell index = 14 (0-indexed)
    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])

    expect(screen.getByText('Sunday, March 15')).toBeInTheDocument()
    expect(screen.getByText('Dishes')).toBeInTheDocument()
    expect(screen.getByText('Alice · 15 pts · One-off')).toBeInTheDocument()
  })

  it('closes the panel when ✕ is clicked', async () => {
    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])
    expect(screen.getByText('Dishes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('Dishes')).not.toBeInTheDocument()
  })

  it('calls onEventClick when a chore row in the panel is clicked', async () => {
    const mockEventClick = vi.fn()
    render(<CalendarView onEventClick={mockEventClick} />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])
    fireEvent.click(screen.getByText('Dishes'))

    expect(mockEventClick).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dishes' }))
  })

  it('shows "+ Add chore" button when onDateClick prop is provided', async () => {
    const mockDateClick = vi.fn()
    render(<CalendarView onDateClick={mockDateClick} />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])

    expect(screen.getByText('+ Add chore on this day')).toBeInTheDocument()
  })

  it('deselects the day when the same cell is clicked again', async () => {
    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    // First click — opens panel
    fireEvent.click(cells[14])
    expect(screen.getByText('Sunday, March 15')).toBeInTheDocument()

    // Second click on same day — closes panel
    fireEvent.click(cells[14])
    expect(screen.queryByText('Sunday, March 15')).not.toBeInTheDocument()
  })

  it('does NOT show "+ Add chore" button when onDateClick is not provided', async () => {
    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])

    expect(screen.queryByText('+ Add chore on this day')).not.toBeInTheDocument()
  })
})
