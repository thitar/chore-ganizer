import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssignmentsPage } from '../pages/AssignmentsPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false, error: null, login: vi.fn(), logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useAssignments', () => ({ useAssignments: vi.fn() }))
vi.mock('../hooks/useTemplates', () => ({ useTemplates: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))
vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn().mockReturnValue({ data: undefined }),
}))

import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const defaultAssignment = {
  id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: '2026-06-15',
  status: 'PENDING' as const, completedAt: null, pointsAwarded: null, notes: null, createdAt: '2026-01-01T00:00:00Z',
  template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
  assignedTo: { id: 2, name: 'Alice', color: '#10B981' },
}

function mockAssignmentsState(overrides: Record<string, unknown> = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [], isLoading: false, error: null,
    createAssignment: mockCreate, updateAssignment: mockUpdate, deleteAssignment: mockDelete,
    completeAssignment: vi.fn(), uncompleteAssignment: vi.fn(),
    isCreating: false, isUpdating: false, isCompleting: false, isUncompleting: false, isDeleting: false,
    ...overrides,
  })
}

function mockTemplatesState(overrides: Record<string, unknown> = {}) {
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({
    templates: [], isLoading: false, error: null,
    createTemplate: vi.fn(), updateTemplate: vi.fn(), deleteTemplate: vi.fn(),
    isCreating: false, isUpdating: false, isDeleting: false,
    ...overrides,
  })
}

function mockUsersState(overrides: Record<string, unknown> = {}) {
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: [], isLoading: false, error: null, ...overrides,
  })
}

function mockDefaultState() {
  mockAssignmentsState()
  mockTemplatesState({ templates: [{ id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen', description: null, createdById: 1, createdAt: '', updatedAt: '' }] })
  mockUsersState({ users: [{ id: 2, name: 'Alice', role: 'CHILD', color: '#10B981' }, { id: 4, name: 'Bob', role: 'CHILD', color: '#F59E0B' }] })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AssignmentsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00'), toFake: ['Date'] })
    vi.clearAllMocks()
    mockDefaultState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading skeleton', () => {
    mockAssignmentsState({ isLoading: true })
    mockTemplatesState({ templates: [{ id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen', description: null, createdById: 1, createdAt: '', updatedAt: '' }] })
    mockUsersState({ users: [] })
    const { container } = renderPage()
    expect(container.querySelector('.animate-\\[shimmer_1\\.5s_infinite\\]')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    renderPage()
    expect(screen.getByText('No assignments yet')).toBeInTheDocument()
    expect(screen.getByText('Assign Chore')).toBeInTheDocument()
  })

  it('renders assignment list with template name, user, date, status', () => {
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
  })

  it('opens create form when Assign Chore clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Assign Chore'))
    expect(screen.getByLabelText('Template')).toBeInTheDocument()
    expect(screen.getByLabelText('Assign To')).toBeInTheDocument()
  })

  it('shows edit form with pre-filled values', () => {
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    fireEvent.click(screen.getByLabelText('Edit assignment'))
    const templateSelect = screen.getByLabelText('Template') as HTMLSelectElement
    expect(templateSelect.value).toBe('1')
  })

  it('shows delete confirmation when delete icon clicked', () => {
    mockAssignmentsState({ assignments: [defaultAssignment] })
    renderPage()
    fireEvent.click(screen.getByLabelText('Delete assignment'))
    expect(screen.getByText('Delete Assignment')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    mockAssignmentsState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
