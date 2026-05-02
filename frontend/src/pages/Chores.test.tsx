/**
 * Chores Page Tests
 *
 * Tests for the Chores management page including loading, error,
 * data display, and role-based views.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/utils'
import type { Mock } from 'vitest'
import { mockUser, mockChoreAssignment } from '../test/utils'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
  useAssignments: vi.fn(),
  useUsers: vi.fn(),
  useTemplates: vi.fn(),
}))

vi.mock('../api', () => ({
  assignmentsApi: {
    getAll: vi.fn(),
    getCalendar: vi.fn(),
  },
}))

vi.mock('../utils/debug', async () => {
  const actual = await vi.importActual<typeof import('../utils/debug')>('../utils/debug')
  return { ...actual, debugError: vi.fn() }
})

import { useAuth, useAssignments, useUsers, useTemplates } from '../hooks'
import { assignmentsApi } from '../api'
import { Chores } from './Chores'

const mockUseAuth = useAuth as Mock
const mockUseAssignments = useAssignments as Mock
const mockUseUsers = useUsers as Mock
const mockUseTemplates = useTemplates as Mock
const mockAssignmentsApiGetAll = assignmentsApi.getAll as Mock

describe('Chores', () => {
  const parentUser = mockUser({ id: 1, name: 'Parent', role: 'PARENT' })
  const childUser = mockUser({ id: 2, name: 'Child', role: 'CHILD' })

  const baseAuthParent = {
    user: parentUser,
    isParent: true,
    isAuthenticated: true,
    loading: false,
    isChild: false,
  }

  const baseAuthChild = {
    user: childUser,
    isParent: false,
    isAuthenticated: true,
    loading: false,
    isChild: true,
  }

  const baseAssignments = {
    assignments: [],
    loading: false,
    error: null,
    createAssignment: vi.fn(),
    updateAssignment: vi.fn(),
    deleteAssignment: vi.fn(),
    completeAssignment: vi.fn(),
    fetchAssignments: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUsers.mockReturnValue({ users: [] })
    mockUseTemplates.mockReturnValue({ templates: [] })
  })

  describe('parent view', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(baseAuthParent)
    })

    it('shows loading state when assignments are loading', () => {
      mockUseAssignments.mockReturnValue({
        ...baseAssignments,
        loading: true,
      })

      render(<Chores />)

      expect(screen.getByText('Loading chores...')).toBeDefined()
    })

    it('shows error state', () => {
      mockUseAssignments.mockReturnValue({
        ...baseAssignments,
        error: 'Failed to load chores',
      })

      render(<Chores />)

      expect(screen.getByText('Failed to load chores')).toBeDefined()
    })

    it('renders page title and description', () => {
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      expect(screen.getByText('Chores')).toBeDefined()
      expect(screen.getByText('Manage your family chores')).toBeDefined()
    })

    it('shows Create Chore button for parents', () => {
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      expect(screen.getByText('Create Chore')).toBeDefined()
    })

    it('shows empty state when no chores exist', () => {
      mockUseAssignments.mockReturnValue({
        ...baseAssignments,
        assignments: [],
      })

      render(<Chores />)

      expect(screen.getByText('No chores found. Create your first chore!')).toBeDefined()
    })

    it('displays chore assignments for parents', () => {
      const chore = mockChoreAssignment({
        id: 1,
        userId: 2,
        choreTemplate: { title: 'Clean Room', points: 10 },
        assignedTo: { id: 2, name: 'Child User', color: '#FF5733' },
        status: 'PENDING',
      })

      mockUseAssignments.mockReturnValue({
        ...baseAssignments,
        assignments: [chore],
      })

      render(<Chores />)

      expect(screen.getByText('Clean Room')).toBeDefined()
      expect(screen.getByText('Assigned to: Child User')).toBeDefined()
    })

    it('shows filter buttons', () => {
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      expect(screen.getByText('All Chores')).toBeDefined()
      expect(screen.getByText('Pending')).toBeDefined()
      expect(screen.getByText('Completed')).toBeDefined()
    })

    it('shows recurring chores info box', () => {
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      expect(screen.getByText(/One-time chores only/)).toBeDefined()
    })
  })

  describe('child view', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(baseAuthChild)
      mockAssignmentsApiGetAll.mockResolvedValue([])
    })

    it('does not show Create Chore button for children', () => {
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      expect(screen.queryByText('Create Chore')).toBeNull()
    })

    it('shows loading state while fetching child assignments', () => {
      mockAssignmentsApiGetAll.mockReturnValue(new Promise(() => {}))
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      expect(screen.getByText('Loading chores...')).toBeDefined()
    })

    it('displays child assignments after fetch', async () => {
      const myChore = mockChoreAssignment({
        id: 1,
        userId: childUser.id,
        choreTemplate: { title: 'My Task', points: 5 },
        assignedTo: { id: childUser.id, name: 'Child', color: '#FF5733' },
        status: 'PENDING',
      })

      mockAssignmentsApiGetAll.mockResolvedValue([myChore])
      mockUseAssignments.mockReturnValue(baseAssignments)

      render(<Chores />)

      await waitFor(() => {
        expect(screen.getByText('My Task')).toBeDefined()
      })
    })
  })
})
