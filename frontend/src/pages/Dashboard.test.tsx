/**
 * Dashboard Page Tests
 *
 * Tests for the Dashboard page including loading, error, and data display states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/utils'
import type { Mock } from 'vitest'
import { mockUser, mockChoreAssignment } from '../test/utils'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
  useAssignments: vi.fn(),
}))

vi.mock('../api', () => ({
  assignmentsApi: {
    getAll: vi.fn(),
    getCalendar: vi.fn(),
  },
}))

vi.mock('../utils/toast', () => ({
  showSuccess: vi.fn(),
}))

import { useAuth, useAssignments } from '../hooks'
import { assignmentsApi } from '../api'
import { Dashboard } from './Dashboard'

const mockUseAuth = useAuth as Mock
const mockUseAssignments = useAssignments as Mock
const mockAssignmentsApiGetAll = assignmentsApi.getAll as Mock
const mockAssignmentsApiGetCalendar = assignmentsApi.getCalendar as Mock

describe('Dashboard', () => {
  const testUser = mockUser({ id: 1, name: 'Test Parent' })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: testUser,
      isParent: true,
      loading: false,
      isAuthenticated: true,
    })
    mockUseAssignments.mockReturnValue({
      completeAssignment: vi.fn(),
    })
  })

  it('shows loading state while fetching assignments', () => {
    // Keep the API promise pending to keep loading=true
    mockAssignmentsApiGetAll.mockReturnValue(new Promise(() => {}))
    mockAssignmentsApiGetCalendar.mockReturnValue(new Promise(() => {}))

    render(<Dashboard />)

    expect(screen.getByText('Loading your dashboard...')).toBeDefined()
  })

  it('shows welcome message with user name', async () => {
    mockAssignmentsApiGetAll.mockResolvedValue([])
    mockAssignmentsApiGetCalendar.mockResolvedValue({
      year: 2026,
      month: 5,
      days: {},
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test Parent!')).toBeDefined()
    })
  })

  it('shows error display on API failure', async () => {
    mockAssignmentsApiGetAll.mockRejectedValue(new Error('Failed to load assignments'))

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Dashboard')).toBeDefined()
      expect(screen.getByText('Failed to load assignments')).toBeDefined()
    })
  })

  it('shows retry button on error', async () => {
    mockAssignmentsApiGetAll.mockRejectedValue(new Error('Network error'))

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/retry/i)).toBeDefined()
    })
  })

  it('displays pending chores with correct title', async () => {
    const pendingAssignment = mockChoreAssignment({
      id: 1,
      userId: testUser.id,
      status: 'PENDING',
      choreTemplate: expect.objectContaining ? undefined : undefined,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    })
    // Override the template title
    const assignmentData = {
      ...pendingAssignment,
      choreTemplate: { ...pendingAssignment.choreTemplate, title: 'Clean Room' },
    }

    mockAssignmentsApiGetAll.mockResolvedValue([assignmentData])
    mockAssignmentsApiGetCalendar.mockResolvedValue({
      year: 2026,
      month: 5,
      days: {},
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('My Chores')).toBeDefined()
      expect(screen.getByText('Clean Room')).toBeDefined()
    })
  })

  it('shows empty state when no pending chores', async () => {
    mockAssignmentsApiGetAll.mockResolvedValue([])
    mockAssignmentsApiGetCalendar.mockResolvedValue({
      year: 2026,
      month: 5,
      days: {},
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('You have no pending chores. Great job!')).toBeDefined()
    })
  })

  it('displays user points', async () => {
    mockAssignmentsApiGetAll.mockResolvedValue([])
    mockAssignmentsApiGetCalendar.mockResolvedValue({
      year: 2026,
      month: 5,
      days: {},
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('100')).toBeDefined() // Points from mockUser
    })
  })

  it('shows completed chores section when toggled', async () => {
    const completedAssignment = mockChoreAssignment({
      id: 2,
      userId: testUser.id,
      status: 'COMPLETED',
      choreTemplate: { ...mockChoreAssignment().choreTemplate, title: 'Wash Dishes' },
      completedAt: new Date().toISOString(),
    })

    mockAssignmentsApiGetAll.mockResolvedValue([completedAssignment])
    mockAssignmentsApiGetCalendar.mockResolvedValue({
      year: 2026,
      month: 5,
      days: {},
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/completed chores/i)).toBeDefined()
    })

    // Click to show completed section
    fireEvent.click(screen.getByText(/completed chores/i))

    await waitFor(() => {
      expect(screen.getByText('Wash Dishes')).toBeDefined()
    })
  })

  it('shows overdue indicator for overdue tasks', async () => {
    const overdueAssignment = mockChoreAssignment({
      id: 3,
      userId: testUser.id,
      status: 'PENDING',
      isOverdue: true,
      choreTemplate: { ...mockChoreAssignment().choreTemplate, title: 'Overdue Task' },
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    })

    mockAssignmentsApiGetAll.mockResolvedValue([overdueAssignment])
    mockAssignmentsApiGetCalendar.mockResolvedValue({
      year: 2026,
      month: 5,
      days: {},
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Overdue!')).toBeDefined()
    })
  })
})
