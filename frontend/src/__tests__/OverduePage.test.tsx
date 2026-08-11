import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OverduePage } from '../pages/OverduePage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const mockCancel = vi.fn()
const mockReschedule = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false, error: null, login: vi.fn(), logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useOverdue', () => ({ useOverdue: vi.fn() }))
vi.mock('../hooks/useGames', () => ({ useGames: vi.fn().mockReturnValue({ data: { pong: { unlocked: true } } }) }))
vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn().mockReturnValue({ data: undefined }),
}))

import { useOverdue } from '../hooks/useOverdue'

const overdueChore = {
  id: 1, type: 'REGULAR' as const, choreTemplateId: 1, assignedToId: 3,
  dueDate: '2026-06-14', status: 'PENDING' as const,
  template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
}

const recurringChore = {
  ...overdueChore, id: 7, type: 'RECURRING' as const, dueDate: '2026-06-13',
  template: { id: 2, title: 'Sweep Floor', points: 5, category: null },
}

function mockOverdueState(overrides: Record<string, unknown> = {}) {
  ;(useOverdue as ReturnType<typeof vi.fn>).mockReturnValue({
    overdue: [], isLoading: false, error: null,
    cancelChore: mockCancel, isCancelling: false,
    rescheduleChore: mockReschedule, isRescheduling: false,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OverduePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OverduePage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00'), toFake: ['Date'] })
    vi.clearAllMocks()
    mockOverdueState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty state when nothing is overdue', () => {
    renderPage()
    expect(screen.getByText('Nothing overdue')).toBeInTheDocument()
  })

  it('renders loading skeleton', () => {
    mockOverdueState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelector('.animate-\\[shimmer_1\\.5s_infinite\\]')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    mockOverdueState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('renders overdue chores with title, assignee, overdue days, and points', () => {
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Overdue 1 days')).toBeInTheDocument()
    expect(screen.getByText('10 pts')).toBeInTheDocument()
  })

  it('opens the cancel modal with penalty defaulted to the chore points', () => {
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByLabelText('Penalty points')).toHaveValue(10)
  })

  it('cancels with penalty and shows a toast', async () => {
    mockCancel.mockResolvedValue({ ...overdueChore, penaltyPoints: 10 })
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('Cancel Chore'))

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(1, 'REGULAR', 10))
    expect(screen.getByText('Chore canceled, 10 pts penalty applied.')).toBeInTheDocument()
  })

  it('shows Reschedule only for REGULAR chores', () => {
    mockOverdueState({ overdue: [overdueChore, recurringChore] })
    renderPage()
    expect(screen.getAllByText('Reschedule')).toHaveLength(1)
  })

  it('reschedules a REGULAR chore and shows a toast', async () => {
    mockReschedule.mockResolvedValue({ ...overdueChore, dueDate: '2026-06-20' })
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    fireEvent.click(screen.getByText('Reschedule'))
    fireEvent.click(screen.getByText('Save Date'))

    await waitFor(() => expect(mockReschedule).toHaveBeenCalledWith(1, '2026-06-15'))
    expect(screen.getByText('Due date updated.')).toBeInTheDocument()
  })
})
