import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { ChoreList } from './ChoreList'
import { mockChoreAssignment, mockUser, mockChild } from '../../test/utils'

describe('ChoreList', () => {
  const mockOnComplete = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    onComplete: mockOnComplete,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    canEdit: true,
    canComplete: true,
    currentUser: mockUser(),
  }

  beforeEach(() => {
    mockOnComplete.mockClear()
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
  })

  it('renders loading state', () => {
    render(<ChoreList {...defaultProps} chores={[]} loading={true} error={null} />)
    expect(screen.getByText('Loading chores...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<ChoreList {...defaultProps} chores={[]} loading={false} error="Failed to load chores" />)
    expect(screen.getByText('Failed to load chores')).toBeInTheDocument()
  })

  it('renders empty state when no chores', () => {
    render(<ChoreList {...defaultProps} chores={[]} loading={false} error={null} />)
    expect(screen.getByText('No chores found. Create your first chore!')).toBeInTheDocument()
  })

  it('renders list of chores', () => {
    const chores = [
      mockChoreAssignment({ id: 1 }),
      mockChoreAssignment({ id: 2, choreTemplate: { ...mockChoreAssignment().choreTemplate, id: 2, title: 'Second Chore' } }),
    ]
    render(<ChoreList {...defaultProps} chores={chores} loading={false} error={null} />)
    expect(screen.getByText('Test Template')).toBeInTheDocument()
    expect(screen.getByText('Second Chore')).toBeInTheDocument()
  })

  it('filters chores for child user - shows only their chores', () => {
    const childUser = mockChild()
    const chores = [
      mockChoreAssignment({ id: 1, assignedToId: childUser.id }),
      mockChoreAssignment({ id: 2, assignedToId: 999, choreTemplate: { ...mockChoreAssignment().choreTemplate, id: 2, title: 'Other Chore' } }),
    ]
    render(
      <ChoreList
        {...defaultProps}
        chores={chores}
        loading={false}
        error={null}
        canEdit={false}
        currentUser={childUser}
      />
    )
    expect(screen.getByText('Test Template')).toBeInTheDocument()
    expect(screen.queryByText('Other Chore')).not.toBeInTheDocument()
  })

  it('shows all chores for parent user', () => {
    const parentUser = mockUser({ role: 'PARENT' })
    const chores = [
      mockChoreAssignment({ id: 1 }),
      mockChoreAssignment({ id: 2, assignedToId: 999, choreTemplate: { ...mockChoreAssignment().choreTemplate, id: 2, title: 'Other Chore' } }),
    ]
    render(
      <ChoreList
        {...defaultProps}
        chores={chores}
        loading={false}
        error={null}
        canEdit={true}
        currentUser={parentUser}
      />
    )
    expect(screen.getByText('Test Template')).toBeInTheDocument()
    expect(screen.getByText('Other Chore')).toBeInTheDocument()
  })

  it('passes correct props to ChoreCard', () => {
    const chore = mockChoreAssignment()
    render(<ChoreList {...defaultProps} chores={[chore]} loading={false} error={null} />)
    
    // Verify chore card is rendered with correct data
    expect(screen.getByText('Test Template')).toBeInTheDocument()
    expect(screen.getByText('15 pts')).toBeInTheDocument()
  })

  it('renders chores in a grid layout', () => {
    const chores = [
      mockChoreAssignment({ id: 1 }),
      mockChoreAssignment({ id: 2, choreTemplate: { ...mockChoreAssignment().choreTemplate, id: 2, title: 'Second Chore' } }),
    ]
    const { container } = render(<ChoreList {...defaultProps} chores={chores} loading={false} error={null} />)
    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })
})
