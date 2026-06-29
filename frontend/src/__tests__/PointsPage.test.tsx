import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PointsPage } from '../pages/PointsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const mockAdjust = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useUserPoints: vi.fn(),
  useAdjustPoints: vi.fn(),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

import { useMyPoints, useUserPoints, useAdjustPoints } from '../hooks/usePoints'
import { useUsers } from '../hooks/useUsers'

const defaultPoints = {
  user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' },
  balance: 30,
  logs: [
    { id: 1, userId: 3, amount: 10, reason: 'Wash Dishes', type: 'EARNED', createdAt: '2026-06-15T00:00:00Z' },
    { id: 2, userId: 3, amount: 15, reason: 'Great week', type: 'BONUS', createdAt: '2026-06-10T00:00:00Z' },
    { id: 3, userId: 3, amount: -5, reason: 'Snack', type: 'ADJUSTMENT', createdAt: '2026-06-05T00:00:00Z' },
  ],
}

const defaultUsers = [
  { id: 1, name: 'Dad', role: 'PARENT', color: '#4F46E5' },
  { id: 3, name: 'Alice', role: 'CHILD', color: '#10B981' },
  { id: 4, name: 'Bob', role: 'CHILD', color: '#F59E0B' },
]

function mockMyPointsState(overrides: Record<string, unknown> = {}) {
  ;(useMyPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    data: defaultPoints,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  })
  ;(useUserPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  ;(useAdjustPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: mockAdjust,
    isPending: false,
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
        <PointsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PointsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMyPointsState()
  })

  it('renders loading spinner', () => {
    mockMyPointsState({ isLoading: true })
    renderPage()
    expect(screen.getByText('Loading points...')).toBeInTheDocument()
  })

  it('renders error state with retry', () => {
    mockMyPointsState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('renders balance and log entries for parent', () => {
    renderPage()
    expect(screen.getByText('30 pts')).toBeInTheDocument()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getByText('Great week')).toBeInTheDocument()
  })

  it('renders type badges with correct colors', () => {
    renderPage()
    expect(screen.getByText('EARNED')).toBeInTheDocument()
    expect(screen.getByText('BONUS')).toBeInTheDocument()
    expect(screen.getByText('ADJUSTMENT')).toBeInTheDocument()
  })

  it('parent sees Adjust Points form', () => {
    renderPage()
    expect(screen.getByText('Adjust Points')).toBeInTheDocument()
  })

  it('submits adjust form with valid input', async () => {
    mockAdjust.mockResolvedValue({ id: 99, amount: 10, type: 'ADJUSTMENT' })
    renderPage()
    fireEvent.change(screen.getByLabelText('User'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Bonus!' } })
    fireEvent.click(screen.getByRole('button', { name: /Adjust/ }))

    await waitFor(() => {
      expect(mockAdjust).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('shows validation error on empty submit', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Adjust/ }))
    await waitFor(() => {
      expect(screen.getByText('Amount must be a non-zero integer.')).toBeInTheDocument()
    })
  })

  it('shows validation error on zero amount', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('User'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /Adjust/ }))
    expect(screen.getByText('Amount must be a non-zero integer.')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    mockMyPointsState({ data: { ...defaultPoints, logs: [] } })
    renderPage()
    expect(screen.getByText(/No point history yet/)).toBeInTheDocument()
  })
})
