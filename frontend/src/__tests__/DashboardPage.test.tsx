import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { DashboardPage } from '../pages/DashboardPage'

// jsdom has no matchMedia — simulate reduced motion so CountUp values render instantly.
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

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useAssignments', () => ({
  useAssignments: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useMyPoints, useLeaderboard } from '../hooks/usePoints'

const mockUser = { id: 1, name: 'Alice', role: 'CHILD', email: 'alice@home.local', color: '#10B981' }

function mockAuth(user: typeof mockUser | null = mockUser) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

function mockAssignmentsState(overrides: Record<string, unknown> = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [],
    isLoading: false,
    error: null,
    ...overrides,
  })
}

function mockPointsState(overrides: Record<string, unknown> = {}) {
  ;(useMyPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { balance: 30 },
    isLoading: false,
    error: null,
    ...overrides,
  })
  ;(useLeaderboard as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockMatchMedia(true)
    mockAuth()
    mockAssignmentsState()
    mockPointsState()
  })

  it('greets the user by name', () => {
    renderPage()
    expect(screen.getByText(/hey alice/i)).toBeInTheDocument()
  })

  it('shows the points balance', () => {
    renderPage()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows an empty state when there are no upcoming chores', () => {
    renderPage()
    expect(screen.getByText('No upcoming chores')).toBeInTheDocument()
  })

  it('shows an error message when assignments fail to load', () => {
    mockAssignmentsState({ error: new Error('boom') })
    renderPage()
    expect(screen.getByText('Unable to load upcoming chores.')).toBeInTheDocument()
  })

  it('lists upcoming chores assigned to the current user', () => {
    const now = new Date()
    const inTwoDays = new Date(now)
    inTwoDays.setDate(now.getDate() + 2)

    mockAssignmentsState({
      assignments: [
        {
          id: 1,
          choreTemplateId: 1,
          assignedToId: mockUser.id,
          dueDate: inTwoDays.toISOString(),
          status: 'PENDING',
          completedAt: null,
          pointsAwarded: null,
          notes: null,
          createdAt: now.toISOString(),
          template: { id: 1, title: 'Wash Dishes', points: 5, category: 'Kitchen' },
          assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
        },
        {
          id: 2,
          choreTemplateId: 2,
          assignedToId: 999, // not the current user — must be excluded
          dueDate: inTwoDays.toISOString(),
          status: 'PENDING',
          completedAt: null,
          pointsAwarded: null,
          notes: null,
          createdAt: now.toISOString(),
          template: { id: 2, title: 'Not Mine', points: 5, category: null },
          assignedTo: { id: 999, name: 'Bob', color: '#F59E0B' },
        },
      ],
    })

    renderPage()

    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.queryByText('Not Mine')).not.toBeInTheDocument()
  })

  it('shows the leaderboard when entries exist', () => {
    ;(useLeaderboard as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ user: { id: 1, name: 'Alice', color: '#10B981', role: 'CHILD' }, balance: 30 }],
      isLoading: false,
    })
    renderPage()
    // "Alice" also appears in TopNav, so assert on the leaderboard's own entry (name + pts).
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('pts').length).toBeGreaterThan(0)
  })

  it('shows a placeholder when no points have been earned yet', () => {
    renderPage()
    expect(screen.getByText('No points earned yet.')).toBeInTheDocument()
  })
})
