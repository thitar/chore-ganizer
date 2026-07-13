import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecurringChoresPage } from '../pages/RecurringChoresPage'

const mockCreate = vi.fn()
const mockDelete = vi.fn()

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

vi.mock('../hooks/useRecurringChores', () => ({
  useRecurringChores: vi.fn(),
}))

vi.mock('../hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn().mockReturnValue({ data: undefined }),
}))

import { useRecurringChores } from '../hooks/useRecurringChores'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const defaultChore = {
  id: 1,
  choreTemplateId: 1,
  assignedToId: 3,
  frequency: 'DAILY' as const,
  dayOfWeek: null,
  dayOfMonth: null,
  createdById: 1,
  createdAt: '2026-01-01T00:00:00Z',
  template: { id: 1, title: 'Make Bed', points: 5, category: 'bedroom' },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
}

const defaultTemplate = {
  id: 1,
  title: 'Make Bed',
  description: null,
  points: 5,
  category: 'bedroom',
  createdById: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const defaultUsers = [
  { id: 1, name: 'Dad', role: 'PARENT', color: '#4F46E5' },
  { id: 3, name: 'Alice', role: 'CHILD', color: '#10B981' },
  { id: 4, name: 'Bob', role: 'CHILD', color: '#F59E0B' },
]

function mockRecurringState(overrides: Record<string, unknown> = {}) {
  ;(useRecurringChores as ReturnType<typeof vi.fn>).mockReturnValue({
    recurringChores: [],
    isLoading: false,
    error: null,
    createRecurringChore: mockCreate,
    isCreating: false,
    deleteRecurringChore: mockDelete,
    isDeleting: false,
    ...overrides,
  })
}

function mockTemplatesState(overrides: Record<string, unknown> = {}) {
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({
    templates: [defaultTemplate],
    isLoading: false,
    error: null,
    ...overrides,
  })
}

function mockUsersState(overrides: Record<string, unknown> = {}) {
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: defaultUsers,
    isLoading: false,
    error: null,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecurringChoresPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RecurringChoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecurringState()
    mockTemplatesState()
    mockUsersState()
  })

  it('renders loading skeleton', () => {
    mockRecurringState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelector('.animate-\\[shimmer_1\\.5s_infinite\\]')).toBeInTheDocument()
  })

  it('renders empty state with Create button', () => {
    renderPage()
    expect(screen.getByText('No recurring chores yet')).toBeInTheDocument()
    expect(screen.getByText('Create Recurring Chore')).toBeInTheDocument()
  })

  it('renders recurring chore list with template name, frequency, and assignee', () => {
    mockRecurringState({ recurringChores: [defaultChore] })
    renderPage()
    expect(screen.getByText('Make Bed')).toBeInTheDocument()
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows create form when Create Recurring Chore clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Create Recurring Chore'))
    expect(screen.getByLabelText('Template')).toBeInTheDocument()
    expect(screen.getByLabelText('Frequency')).toBeInTheDocument()
    expect(screen.getByLabelText('Assigned To')).toBeInTheDocument()
  })

  it('shows dayOfWeek field when frequency is WEEKLY', () => {
    renderPage()
    fireEvent.click(screen.getByText('Create Recurring Chore'))
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'WEEKLY' } })
    expect(screen.getByLabelText('Day of Week')).toBeInTheDocument()
  })

  it('shows dayOfMonth field when frequency is MONTHLY', () => {
    renderPage()
    fireEvent.click(screen.getByText('Create Recurring Chore'))
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'MONTHLY' } })
    expect(screen.getByLabelText('Day of Month')).toBeInTheDocument()
  })

  it('submits create form and calls createRecurringChore with mapped fields', async () => {
    mockCreate.mockResolvedValue(defaultChore)
    renderPage()
    fireEvent.click(screen.getByText('Create Recurring Chore'))
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assigned To'), { target: { value: '3' } })

    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 1,
          userId: 3,
          frequency: 'DAILY',
        })
      )
    })
  })

  it('shows delete confirmation when delete icon clicked', () => {
    mockRecurringState({ recurringChores: [defaultChore] })
    renderPage()
    const deleteBtn = screen.getByLabelText('Delete recurring chore')
    fireEvent.click(deleteBtn)
    expect(screen.getByText(/Delete this recurring chore/)).toBeInTheDocument()
  })

  it('calls deleteRecurringChore on confirm', async () => {
    mockDelete.mockResolvedValue({ deleted: true })
    mockRecurringState({ recurringChores: [defaultChore] })
    renderPage()
    fireEvent.click(screen.getByLabelText('Delete recurring chore'))
    const confirmBtn = screen.getByText('Delete', { selector: 'button' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1)
    })
  })

  it('renders error state with retry', () => {
    mockRecurringState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
