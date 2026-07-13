import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UsersPage } from '../pages/UsersPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const mockCreate = vi.fn()
const mockDelete = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useMyPoints: vi.fn(),
  useLeaderboard: vi.fn(),
  useGamification: vi.fn().mockReturnValue({ data: undefined }),
}))

import { useUsers } from '../hooks/useUsers'

const defaultUsers = [
  { id: 1, name: 'Dad', role: 'PARENT', color: '#4F46E5' },
  { id: 2, name: 'Mom', role: 'PARENT', color: '#EC4899' },
  { id: 3, name: 'Alice', role: 'CHILD', color: '#10B981' },
  { id: 4, name: 'Bob', role: 'CHILD', color: '#F59E0B' },
]

function mockUsersState(overrides: Record<string, unknown> = {}) {
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: defaultUsers,
    isLoading: false,
    error: null,
    createUser: mockCreate,
    isCreating: false,
    deleteUser: mockDelete,
    isDeleting: false,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersState()
  })

  it('renders loading skeleton', () => {
    mockUsersState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelector('.animate-\\[shimmer_1\\.5s_infinite\\]')).toBeInTheDocument()
  })

  it('renders error state with retry', () => {
    mockUsersState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('renders user list with role badges and color swatches', () => {
    renderPage()
    expect(screen.getAllByText('Dad').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PARENT').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CHILD').length).toBeGreaterThan(0)
  })

  it('shows "You" instead of delete button for current user', () => {
    renderPage()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('shows create form when Create User clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Create User'))
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
  })

  it('submits create form and calls createUser', async () => {
    mockCreate.mockResolvedValue({ id: 5, name: 'New', email: 'n@h.local', role: 'CHILD', color: '#3B82F6' })
    renderPage()
    fireEvent.click(screen.getByText('Create User'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@home.local' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New User',
        email: 'new@home.local',
      }))
    })
  })

  it('shows delete confirmation when delete icon clicked', () => {
    renderPage()
    const deleteBtns = screen.getAllByLabelText('Delete user')
    fireEvent.click(deleteBtns[0])
    expect(screen.getByText(/Delete this family member/)).toBeInTheDocument()
  })

  it('calls deleteUser on confirm', async () => {
    mockDelete.mockResolvedValue({ deleted: true })
    renderPage()
    const deleteBtns = screen.getAllByLabelText('Delete user')
    fireEvent.click(deleteBtns[0])
    const confirmDelete = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmDelete)
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
    })
  })
})
