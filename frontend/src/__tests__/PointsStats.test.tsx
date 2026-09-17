import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PointsStats } from '../components/PointsStats'

vi.mock('../hooks/usePoints', () => ({ usePointsStats: vi.fn() }))
import { usePointsStats } from '../hooks/usePoints'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderCard() {
  return render(
    <QueryClientProvider client={queryClient}>
      <PointsStats />
    </QueryClientProvider>
  )
}

describe('PointsStats', () => {
  beforeEach(() => {
    ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        from: '2026-08-25T00:00:00.000Z',
        to: null,
        entries: [
          { user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }, points: 40 },
          { user: { id: 4, name: 'Bob', color: '#F59E0B', role: 'CHILD' }, points: 10 },
        ],
      },
      isLoading: false,
    })
  })

  it('defaults to the This week period and shows each child\'s points', () => {
    renderCard()
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('switches period on click and calls usePointsStats with a computed range', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'This month' }))
    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false')
    const calls = (usePointsStats as ReturnType<typeof vi.fn>).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toEqual(expect.any(String))
    expect(lastCall[1]).toEqual(expect.any(String))
  })

  it('shows a loading skeleton while fetching', () => {
    ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined, isLoading: true })
    renderCard()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('shows an empty state when no points were earned in range', () => {
    ;(usePointsStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { from: '2026-08-25T00:00:00.000Z', to: null, entries: [] },
      isLoading: false,
    })
    renderCard()
    expect(screen.getByText('No points earned in this period.')).toBeInTheDocument()
  })
})
