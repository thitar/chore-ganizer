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
  useGamification: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useMyPoints, useLeaderboard, useGamification } from '../hooks/usePoints'

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
  ;(useGamification as ReturnType<typeof vi.fn>).mockReturnValue({
    data: {
      streak: 3,
      level: { level: 1, lifetimePoints: 0, currentThreshold: 0, nextThreshold: 50, progress: 0 },
      badges: [],
    },
    isLoading: false,
  })
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

  it('shows the weekly streak stat', () => {
    renderPage()
    const streakCard = screen.getByText('Streak').closest('div')
    expect(streakCard).not.toBeNull()
    expect(streakCard).toHaveTextContent('3')
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

  describe('weekly progress and due-today (frozen clock)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: new Date('2026-06-17T12:00:00'), toFake: ['Date'] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('computes week math including boundaries, excluding other users and out-of-week dates', () => {
      mockAssignmentsState({
        assignments: [
          {
            id: 1,
            choreTemplateId: 1,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-15T09:00:00').toISOString(), // Mon, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-15T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 1, title: 'Mon Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 2,
            choreTemplateId: 2,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-17T09:00:00').toISOString(), // Wed, in-week (today)
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 2, title: 'Wed Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 3,
            choreTemplateId: 3,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-21T09:00:00').toISOString(), // Sun, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-21T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 3, title: 'Sun Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 4,
            choreTemplateId: 4,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-14T09:00:00').toISOString(), // prior Sun, out of week
            // PENDING (not COMPLETED) so a Monday-vs-Sunday week-start regression
            // changes the done/total counts instead of passing coincidentally
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-01T09:00:00').toISOString(),
            template: { id: 4, title: 'Prior Sun Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 5,
            choreTemplateId: 5,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-22T09:00:00').toISOString(), // next Mon, out of week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-22T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 5, title: 'Next Mon Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 6,
            choreTemplateId: 6,
            assignedToId: 999, // other user, in-week — must be excluded from counts
            dueDate: new Date('2026-06-16T09:00:00').toISOString(), // Tue, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-16T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 6, title: 'Other User Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: 999, name: 'Bob', color: '#F59E0B' },
          },
        ],
      })

      renderPage()

      expect(screen.getByRole('img', { name: '2 of 3' })).toBeInTheDocument()
      expect(screen.getByText('2 of 3 done')).toBeInTheDocument()
      expect(screen.getByText(/keep it going!/i)).toBeInTheDocument()
    })

    it('counts only in-week, current-user PENDING assignments due today for "Due today"', () => {
      mockAssignmentsState({
        assignments: [
          {
            id: 1,
            choreTemplateId: 1,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-17T09:00:00').toISOString(), // today
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 1, title: 'Today Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 2,
            choreTemplateId: 2,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-18T09:00:00').toISOString(), // tomorrow
            status: 'PENDING',
            completedAt: null,
            pointsAwarded: null,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 2, title: 'Tomorrow Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
        ],
      })

      renderPage()

      const dueTodayCard = screen.getByText('Due today').closest('div')
      expect(dueTodayCard).not.toBeNull()
      expect(dueTodayCard).toHaveTextContent('1')
    })

    it('shows the week-complete message when all in-week assignments are done', () => {
      mockAssignmentsState({
        assignments: [
          {
            id: 1,
            choreTemplateId: 1,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-15T09:00:00').toISOString(), // Mon, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-15T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 1, title: 'Mon Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
          {
            id: 2,
            choreTemplateId: 2,
            assignedToId: mockUser.id,
            dueDate: new Date('2026-06-17T09:00:00').toISOString(), // Wed, in-week
            status: 'COMPLETED',
            completedAt: new Date('2026-06-17T09:30:00').toISOString(),
            pointsAwarded: 5,
            notes: null,
            createdAt: new Date('2026-06-10T09:00:00').toISOString(),
            template: { id: 2, title: 'Wed Chore', points: 5, category: 'Kitchen' },
            assignedTo: { id: mockUser.id, name: 'Alice', color: '#10B981' },
          },
        ],
      })

      renderPage()

      expect(screen.getByRole('img', { name: '2 of 2' })).toBeInTheDocument()
      expect(screen.getByText(/week complete/i)).toBeInTheDocument()
    })
  })
})
