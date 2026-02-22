import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { ChoreCard } from './ChoreCard'
import { mockChoreAssignment, mockTemplate, mockChild } from '../../test/utils'

describe('ChoreCard', () => {
  const mockOnComplete = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    onComplete: mockOnComplete,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    canEdit: true,
    canComplete: true,
  }

  beforeEach(() => {
    mockOnComplete.mockClear()
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
  })

  it('renders chore title', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('Test Template')).toBeInTheDocument()
  })

  it('renders chore description', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('Test template description')).toBeInTheDocument()
  })

  it('renders points', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('15 pts')).toBeInTheDocument()
  })

  it('renders assigned user name', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText(/Assigned to: Child User/)).toBeInTheDocument()
  })

  it('renders PENDING status correctly', () => {
    const chore = mockChoreAssignment({ status: 'PENDING' })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  it('renders COMPLETED status correctly', () => {
    const chore = mockChoreAssignment({ status: 'COMPLETED' })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
  })

  it('renders PARTIALLY_COMPLETE status correctly', () => {
    const chore = mockChoreAssignment({ status: 'PARTIALLY_COMPLETE' })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('PARTIALLY COMPLETE')).toBeInTheDocument()
  })

  it('shows overdue indicator when chore is overdue', () => {
    const chore = mockChoreAssignment({ isOverdue: true, status: 'PENDING' })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('Overdue!')).toBeInTheDocument()
  })

  it('does not show overdue indicator when chore is not overdue', () => {
    const chore = mockChoreAssignment({ isOverdue: false })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.queryByText('Overdue!')).not.toBeInTheDocument()
  })

  it('shows Complete and Partial buttons when canComplete and status is PENDING', () => {
    const chore = mockChoreAssignment({ status: 'PENDING' })
    render(<ChoreCard chore={chore} {...defaultProps} canComplete={true} />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.getByText('Partial')).toBeInTheDocument()
  })

  it('hides Complete and Partial buttons when status is not PENDING', () => {
    const chore = mockChoreAssignment({ status: 'COMPLETED' })
    render(<ChoreCard chore={chore} {...defaultProps} canComplete={true} />)
    expect(screen.queryByText('Complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Partial')).not.toBeInTheDocument()
  })

  it('hides Complete and Partial buttons when canComplete is false', () => {
    const chore = mockChoreAssignment({ status: 'PENDING' })
    render(<ChoreCard chore={chore} {...defaultProps} canComplete={false} />)
    expect(screen.queryByText('Complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Partial')).not.toBeInTheDocument()
  })

  it('shows Edit and Delete buttons when canEdit is true', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} canEdit={true} />)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('hides Edit and Delete buttons when canEdit is false', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} canEdit={false} />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('calls onComplete with COMPLETED when Complete button is clicked', () => {
    const chore = mockChoreAssignment({ status: 'PENDING' })
    render(<ChoreCard chore={chore} {...defaultProps} canComplete={true} />)
    fireEvent.click(screen.getByText('Complete'))
    expect(mockOnComplete).toHaveBeenCalledWith(chore.id, 'COMPLETED')
  })

  it('calls onComplete with PARTIALLY_COMPLETE when Partial button is clicked', () => {
    const chore = mockChoreAssignment({ status: 'PENDING' })
    render(<ChoreCard chore={chore} {...defaultProps} canComplete={true} />)
    fireEvent.click(screen.getByText('Partial'))
    expect(mockOnComplete).toHaveBeenCalledWith(chore.id, 'PARTIALLY_COMPLETE')
  })

  it('calls onEdit when Edit button is clicked', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} canEdit={true} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(mockOnEdit).toHaveBeenCalledWith(chore)
  })

  it('calls onDelete when Delete button is clicked', () => {
    const chore = mockChoreAssignment()
    render(<ChoreCard chore={chore} {...defaultProps} canEdit={true} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(mockOnDelete).toHaveBeenCalledWith(chore.id)
  })

  it('renders "Untitled" when chore template has no title', () => {
    const chore = mockChoreAssignment({
      choreTemplate: mockTemplate({ title: '' })
    })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('renders "No due date" when dueDate is null', () => {
    const chore = mockChoreAssignment({ dueDate: null as unknown as string })
    render(<ChoreCard chore={chore} {...defaultProps} />)
    expect(screen.getByText(/Due: No due date/)).toBeInTheDocument()
  })
})
