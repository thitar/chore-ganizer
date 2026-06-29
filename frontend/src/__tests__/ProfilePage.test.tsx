import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfilePage } from '../pages/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 3, name: 'Alice', role: 'CHILD', email: 'alice@home.local', color: '#10B981' },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

vi.mock('../api/users.api', () => ({
  updateColor: vi.fn().mockResolvedValue({ color: '#FF00FF' }),
  updatePassword: vi.fn().mockResolvedValue({ updated: true }),
}))

import { useUsers } from '../hooks/useUsers'
import * as usersApi from '../api/users.api'

function mockUsersState(overrides: Record<string, unknown> = {}) {
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: [{ id: 3, name: 'Alice', role: 'CHILD', color: '#10B981' }],
    isLoading: false,
    error: null,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersState()
  })

  it('renders user info card', () => {
    renderPage()
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getByText(/Role: CHILD/)).toBeInTheDocument()
  })

  it('renders change password form', () => {
    renderPage()
    expect(screen.getByText('Change Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
    expect(screen.getByLabelText(/New password/)).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
  })

  it('renders display color section', () => {
    renderPage()
    expect(screen.getByText('Display Color')).toBeInTheDocument()
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
  })

  it('shows validation error when password fields are empty', () => {
    renderPage()
    const updateBtn = screen.getByRole('button', { name: 'Update Password' })
    fireEvent.click(updateBtn)
    expect(screen.getByText('All fields are required.')).toBeInTheDocument()
  })

  it('shows error when new password is too short', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('New password (min 6)'), { target: { value: '12345' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(screen.getByText('New password must be at least 6 characters.')).toBeInTheDocument()
  })

  it('shows error when new password and confirm do not match', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('New password (min 6)'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpass2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(screen.getByText('New password and confirmation do not match.')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    mockUsersState({ isLoading: true, users: [] })
    renderPage()
    expect(screen.getByText('Loading profile...')).toBeInTheDocument()
  })

  it('invalidates users + auth queries after color change (AUTH-06 regression)', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Update Color' }))
    await waitFor(() => {
      expect(usersApi.updateColor).toHaveBeenCalled()
    })
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(expect.arrayContaining(['users']))
    expect(invalidatedKeys).toContainEqual(expect.arrayContaining(['auth', 'me']))
  })

  it('invalidates auth query after password change', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    renderPage()
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('New password (min 6)'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpass1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    await waitFor(() => {
      expect(usersApi.updatePassword).toHaveBeenCalled()
    })
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(expect.arrayContaining(['auth', 'me']))
  })
})
