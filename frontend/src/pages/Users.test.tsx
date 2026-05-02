/**
 * Users Page Tests
 *
 * Tests for the Users management page including loading, error,
 * and data display states for parents.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils'
import type { Mock } from 'vitest'
import { mockUser } from '../test/utils'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
  useUsers: vi.fn(),
}))

// Mock user sub-components to avoid deep rendering complexity
vi.mock('../components/users', () => ({
  UserTable: ({ users }: { users: { name: string }[] }) => (
    <div data-testid="user-table">
      {users.map((u: { name: string }) => (
        <div key={u.name}>{u.name}</div>
      ))}
    </div>
  ),
  UserForm: () => <div data-testid="user-form" />,
  ConfirmDialog: () => <div data-testid="confirm-dialog" />,
}))

vi.mock('../components/common', async () => {
  const actual = await vi.importActual<typeof import('../components/common')>('../components/common')
  return {
    ...actual,
    Modal: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
      isOpen ? (
        <div data-testid="modal">
          <h2>{title}</h2>
          {children}
        </div>
      ) : null,
    ErrorDisplay: ({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) => (
      <div data-testid="error-display">
        <h3>{title}</h3>
        <p>{message}</p>
        {onRetry && <button onClick={onRetry}>Retry</button>}
      </div>
    ),
  }
})

import { useAuth, useUsers } from '../hooks'
import Users from './Users'

const mockUseAuth = useAuth as Mock
const mockUseUsers = useUsers as Mock

describe('Users', () => {
  const parentUser = mockUser({ id: 1, name: 'Parent User', role: 'PARENT' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parent view', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: parentUser,
        isParent: true,
        isAuthenticated: true,
        loading: false,
        isChild: false,
        logout: vi.fn(),
      })
    })

    it('shows loading state', () => {
      mockUseUsers.mockReturnValue({
        users: [],
        loading: true,
        error: null,
        parentCount: 0,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        lockUser: vi.fn(),
        unlockUser: vi.fn(),
        refresh: vi.fn(),
      })

      render(<Users />)

      expect(screen.getByText('Loading...')).toBeDefined()
    })

    it('shows error state', () => {
      mockUseUsers.mockReturnValue({
        users: [],
        loading: false,
        error: 'Failed to load users',
        parentCount: 0,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        lockUser: vi.fn(),
        unlockUser: vi.fn(),
        refresh: vi.fn(),
      })

      render(<Users />)

      expect(screen.getByText('Unable to Load Users')).toBeDefined()
      expect(screen.getByText('Failed to load users')).toBeDefined()
    })

    it('renders page title and description', () => {
      mockUseUsers.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        parentCount: 1,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        lockUser: vi.fn(),
        unlockUser: vi.fn(),
        refresh: vi.fn(),
      })

      render(<Users />)

      expect(screen.getByText('Family Members')).toBeDefined()
      expect(screen.getByText('Manage your family members')).toBeDefined()
    })

    it('shows Add User button for parents', () => {
      mockUseUsers.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        parentCount: 1,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        lockUser: vi.fn(),
        unlockUser: vi.fn(),
        refresh: vi.fn(),
      })

      render(<Users />)

      expect(screen.getByText('Add User')).toBeDefined()
    })

    it('displays user list', () => {
      const users = [
        mockUser({ id: 1, name: 'Parent User', role: 'PARENT' }),
        mockUser({ id: 2, name: 'Child User', role: 'CHILD' }),
      ]

      mockUseUsers.mockReturnValue({
        users,
        loading: false,
        error: null,
        parentCount: 1,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        lockUser: vi.fn(),
        unlockUser: vi.fn(),
        refresh: vi.fn(),
      })

      render(<Users />)

      expect(screen.getByText('Parent User')).toBeDefined()
      expect(screen.getByText('Child User')).toBeDefined()
    })

    it('shows retry button on error', () => {
      const refresh = vi.fn()
      mockUseUsers.mockReturnValue({
        users: [],
        loading: false,
        error: 'API Error',
        parentCount: 0,
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        lockUser: vi.fn(),
        unlockUser: vi.fn(),
        refresh,
      })

      render(<Users />)

      expect(screen.getByText(/retry/i)).toBeDefined()
    })
  })
})
