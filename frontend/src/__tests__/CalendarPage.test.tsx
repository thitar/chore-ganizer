import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CalendarPage } from '../pages/CalendarPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useCalendar', () => ({
  useCalendarMonth: vi.fn(),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn().mockReturnValue({ data: undefined }),
}))

import { useCalendarMonth } from '../hooks/useCalendar'
import { useUsers } from '../hooks/useUsers'

const defaultUsers = [
  { id: 1, name: 'Dad', role: 'PARENT', color: '#4F46E5' },
  { id: 3, name: 'Alice', role: 'CHILD', color: '#10B981' },
  { id: 4, name: 'Bob', role: 'CHILD', color: '#F59E0B' },
]

const defaultAssignments = [
  {
    id: 1,
    type: 'REGULAR' as const,
    choreTemplateId: 1,
    assignedToId: 3,
    dueDate: '2026-06-15',
    status: 'PENDING' as const,
    pointsAwarded: null,
    template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
  },
  {
    id: 2,
    type: 'RECURRING' as const,
    choreTemplateId: 4,
    assignedToId: 4,
    dueDate: '2026-06-20',
    status: 'PENDING' as const,
    pointsAwarded: null,
    template: { id: 4, title: 'Take Out Trash', points: 5, category: 'chores' },
    assignedTo: { id: 4, name: 'Bob', color: '#F59E0B' },
  },
]

function mockCalendarState(overrides: Record<string, unknown> = {}) {
  ;(useCalendarMonth as ReturnType<typeof vi.fn>).mockReturnValue({
    data: defaultAssignments,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    from: '2026-06-01',
    to: '2026-06-30',
    ...overrides,
  })
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: defaultUsers,
    isLoading: false,
    error: null,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00'), toFake: ['Date'] })
    vi.clearAllMocks()
    mockCalendarState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading skeleton', () => {
    mockCalendarState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelectorAll('.animate-\\[shimmer_1\\.5s_infinite\\]').length).toBeGreaterThan(0)
  })

  it('renders error state with retry', () => {
    mockCalendarState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders month header and day labels', () => {
    renderPage()
    expect(screen.getByText(/June 2026/)).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
  })

  it('renders assignment pills with user colors', () => {
    renderPage()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getByText('Take Out Trash')).toBeInTheDocument()
  })

  it('renders user legend with color swatches', () => {
    renderPage()
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dad').length).toBeGreaterThan(0)
  })

  it('has prev and next month buttons', () => {
    renderPage()
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument()
    expect(screen.getByLabelText('Next month')).toBeInTheDocument()
  })

  it('clicking next month increments month', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText('Next month'))
    expect(screen.getByText(/July 2026/)).toBeInTheDocument()
  })

  it('clicking prev month decrements month', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText('Previous month'))
    expect(screen.getByText(/May 2026/)).toBeInTheDocument()
  })

  it('clicking Today returns to current month', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText('Next month'))
    expect(screen.getByText(/July 2026/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Today')[0])
    expect(screen.getByText(/June 2026/)).toBeInTheDocument()
  })

  it('shows empty state when no assignments in month', () => {
    mockCalendarState({ data: [] })
    renderPage()
    expect(screen.getByText(/No chores scheduled for June/)).toBeInTheDocument()
  })
})
