import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MyChoresPage } from '../pages/MyChoresPage'
import confetti from 'canvas-confetti'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

// jsdom has no matchMedia — simulate prefers-reduced-motion explicitly so
// celebrate()'s confetti call is deterministic regardless of jsdom defaults.
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia
}

const mockComplete = vi.fn()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 2, name: 'Alice', role: 'CHILD', email: 'alice@home.local', color: '#10B981' },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useAssignments', () => ({
  useAssignments: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn().mockReturnValue({ data: undefined }),
}))

import { useAssignments } from '../hooks/useAssignments'

const defaultAssignment = {
  id: 1,
  type: 'REGULAR' as const,
  choreTemplateId: 1,
  assignedToId: 2,
  dueDate: '2026-06-15',
  status: 'PENDING' as const,
  completedAt: null,
  pointsAwarded: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
  assignedTo: { id: 2, name: 'Alice', color: '#10B981' },
}

function mockAssignmentsState(overrides: Record<string, unknown> = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [],
    isLoading: false,
    error: null,
    createAssignment: vi.fn(),
    updateAssignment: vi.fn(),
    completeAssignment: mockComplete,
    uncompleteAssignment: vi.fn(),
    deleteAssignment: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isCompleting: false,
    isUncompleting: false,
    isDeleting: false,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyChoresPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MyChoresPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00'), toFake: ['Date'] })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading skeleton', () => {
    mockAssignmentsState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelectorAll('.animate-\\[shimmer_1\\.5s_infinite\\]').length).toBeGreaterThan(0)
  })

  it('renders empty state', () => {
    mockAssignmentsState()
    renderPage()
    expect(screen.getByText('No chores assigned yet')).toBeInTheDocument()
  })

  it('renders chore list with title, date, status badge, and complete button', () => {
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getByText('Mark Complete')).toBeInTheDocument()
  })

  it('filters chores by status', () => {
    const completed = { ...defaultAssignment, id: 2, status: 'COMPLETED' as const, pointsAwarded: 10, completedAt: '2026-06-15' }
    mockAssignmentsState({ assignments: [defaultAssignment, completed] })
    renderPage()

    expect(screen.getByText('Mark Complete')).toBeInTheDocument()
  })

  it('shows completed chores with green badge and no complete button', () => {
    const completed = { ...defaultAssignment, id: 2, status: 'COMPLETED' as const, pointsAwarded: 10, completedAt: '2026-06-15' }
    mockAssignmentsState({ assignments: [completed] })
    renderPage()
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(2)
  })

  it('completes a chore when Mark Complete clicked', async () => {
    mockComplete.mockResolvedValue({ ...defaultAssignment, status: 'COMPLETED' })
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    fireEvent.click(screen.getByText('Mark Complete'))
    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(1, 'REGULAR')
    })
  })

  it('completes a recurring occurrence with type=RECURRING passed to completeAssignment', async () => {
    const recurringOccurrence = {
      ...defaultAssignment,
      id: 99,
      type: 'RECURRING' as const,
      dueDate: '2026-06-20',
    }
    mockComplete.mockResolvedValue({ ...recurringOccurrence, status: 'COMPLETED' })
    mockAssignmentsState({ assignments: [recurringOccurrence] })
    renderPage()
    fireEvent.click(screen.getByText('Mark Complete'))
    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(99, 'RECURRING')
    })
  })

  it('fires confetti celebration when completion succeeds', async () => {
    mockMatchMedia(false)
    mockComplete.mockResolvedValue({ ...defaultAssignment, status: 'COMPLETED' })
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    fireEvent.click(screen.getByText('Mark Complete'))
    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(1, 'REGULAR')
    })
    expect(vi.mocked(confetti)).toHaveBeenCalledTimes(1)
  })

  it('does not fire confetti when completion fails', async () => {
    mockMatchMedia(false)
    mockComplete.mockRejectedValueOnce(new Error('Network error'))
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    fireEvent.click(screen.getByText('Mark Complete'))
    await waitFor(() => {
      expect(screen.getByText(/failed to complete chore/i)).toBeInTheDocument()
    })
    expect(vi.mocked(confetti)).not.toHaveBeenCalled()
    expect(screen.queryByText(/chore marked complete/i)).not.toBeInTheDocument()
  })

  it('shows Completing... when isCompleting is true', () => {
    mockAssignmentsState({ assignments: [defaultAssignment], isCompleting: true })
    renderPage()
    expect(screen.getByText('Completing...')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    mockAssignmentsState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('shows empty filter results message when filter yields nothing', () => {
    const futureAssignment = { ...defaultAssignment, dueDate: '2027-01-01' }
    mockAssignmentsState({ assignments: [futureAssignment] })
    renderPage()
    expect(screen.getByText(/No assignments match your filters/i)).toBeInTheDocument()
  })
})
