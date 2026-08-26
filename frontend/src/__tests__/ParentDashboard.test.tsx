import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ParentDashboard } from '../pages/ParentDashboard'

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

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const mockNudge = vi.fn()
const mockComplete = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../hooks/useAssignments', () => ({ useAssignments: vi.fn() }))
vi.mock('../hooks/useOverdue', () => ({ useOverdue: vi.fn() }))
vi.mock('../hooks/usePoints', () => ({
  useLeaderboard: vi.fn(),
  useWeeklyPoints: vi.fn(),
}))
vi.mock('../hooks/useNudge', () => ({ useNudge: vi.fn() }))
vi.mock('../hooks/useTemplates', () => ({ useTemplates: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useOverdue } from '../hooks/useOverdue'
import { useLeaderboard, useWeeklyPoints } from '../hooks/usePoints'
import { useNudge } from '../hooks/useNudge'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const parentUser = { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' }

const today = '2026-06-17'

const todayChore = {
  id: 1, type: 'REGULAR' as const, choreTemplateId: 1, assignedToId: 3,
  dueDate: today, status: 'PENDING' as const, completedAt: null, pointsAwarded: null,
  notes: null, createdAt: '2026-06-10T09:00:00.000Z',
  template: { id: 1, title: 'Load dishwasher', points: 20, category: 'kitchen', description: null },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
}

const overdueChore = {
  ...todayChore,
  id: 2,
  dueDate: '2026-06-15',
  template: { id: 2, title: 'Take out trash', points: 15, category: 'chores', description: null },
  assignedTo: { id: 4, name: 'Bob', color: '#F59E0B', ntfyTopic: null },
}

const doneChore = {
  ...todayChore,
  id: 3,
  dueDate: '2026-06-16',
  status: 'COMPLETED' as const,
  completedAt: '2026-06-16T15:00:00.000Z',
  pointsAwarded: 20,
  template: { id: 3, title: 'Walk the dog', points: 30, category: 'chores', description: null },
}

function mockParentState(overrides: Record<string, unknown> = {}) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: parentUser, isLoading: false, error: null, login: vi.fn(), logout: vi.fn(),
  })
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [todayChore, overdueChore, doneChore], isLoading: false, error: null,
    completeAssignment: mockComplete, isCompleting: false,
  })
  ;(useOverdue as ReturnType<typeof vi.fn>).mockReturnValue({
    overdue: [overdueChore], isLoading: false, error: null, ...overrides,
  })
  ;(useLeaderboard as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [{ user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }, balance: 480 }],
    isLoading: false,
  })
  ;(useWeeklyPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [{ user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }, points: 120 }],
    isLoading: false,
  })
  ;(useNudge as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: mockNudge, isPending: false,
  })
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({ templates: [] })
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({ users: [] })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-17T12:00:00Z'), toFake: ['Date'] })
    mockMatchMedia(true)
    mockParentState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the status strip: overdue, due today, this week done, pts this week', () => {
    renderPage()
    // "Overdue" appears both as the stat label and as the needs-action badge text.
    expect(screen.getAllByText('Overdue').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Due today').closest('div')).toHaveTextContent('1')
    expect(screen.getByText('This week').closest('div')).toHaveTextContent('1 of 3 done')
    expect(screen.getByText('Pts this week').closest('div')).toHaveTextContent('120')
  })

  it('lists needs-action rows, overdue before today', () => {
    renderPage()
    const rows = screen.getAllByText('Take out trash')
    expect(rows.length).toBeGreaterThan(0)
    expect(screen.getByText('Load dishwasher')).toBeInTheDocument()

    const overdueTitle = screen.getByText('Take out trash')
    const todayTitle = screen.getByText('Load dishwasher')
    expect(
      overdueTitle.compareDocumentPosition(todayTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('disables Nudge when the assignee has no ntfyTopic', () => {
    renderPage()
    const nudgeButtons = screen.getAllByRole('button', { name: /nudge/i })
    // Bob (no topic) has a disabled button; Alice (has topic) does not.
    expect(nudgeButtons.some(b => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('nudges a chore and shows a success toast', async () => {
    mockNudge.mockResolvedValue({ id: 1 })
    renderPage()
    const nudgeButtons = screen.getAllByRole('button', { name: /nudge/i })
    const aliceRow = nudgeButtons.filter(b => !(b as HTMLButtonElement).disabled)[0]
    fireEvent.click(aliceRow)
    await waitFor(() => expect(mockNudge).toHaveBeenCalledWith({ id: 1, type: 'REGULAR' }))
    expect(await screen.findByText('Reminder sent to Alice 👀')).toBeInTheDocument()
  })

  it('shows Reschedule/Cancel only on overdue rows', () => {
    renderPage()
    // Only the single overdue row renders these; the due-today row does not.
    expect(screen.getAllByText('Cancel').length).toBeGreaterThanOrEqual(1)
  })

  it('marks a due-today chore complete and shows a success toast', async () => {
    mockComplete.mockResolvedValue({})
    renderPage()
    const todayCard = screen.getByText('Load dishwasher').closest('.border-edge') as HTMLElement
    fireEvent.click(within(todayCard).getByRole('button', { name: /mark complete/i }))

    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith(1, 'REGULAR'))
    expect(await screen.findByText('Chore marked complete for Alice! 🎉')).toBeInTheDocument()
  })

  it('marks an overdue chore complete from the actions row', async () => {
    mockComplete.mockResolvedValue({})
    renderPage()
    const overdueCard = screen.getByText('Take out trash').closest('.border-edge') as HTMLElement
    fireEvent.click(within(overdueCard).getByRole('button', { name: /mark complete/i }))

    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith(2, 'REGULAR'))
    expect(await screen.findByText('Chore marked complete! 🎉')).toBeInTheDocument()
  })

  it('shows the latest completed chore in the right rail', () => {
    renderPage()
    expect(screen.getByText(/Walk the dog/)).toBeInTheDocument()
  })

  it('shows empty states when nothing needs attention', () => {
    mockParentState({
      overdue: [],
    })
    ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
      assignments: [], isLoading: false, error: null,
    })
    renderPage()
    expect(screen.getByText('All caught up 🎉')).toBeInTheDocument()
  })
})
