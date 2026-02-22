import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import { ChoreForm } from './ChoreForm'
import { mockUser, mockTemplate, mockChoreAssignment } from '../../test/utils'

describe('ChoreForm', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined)

  const mockUsers = [
    mockUser({ id: 1, name: 'Parent User', role: 'PARENT' }),
    mockUser({ id: 2, name: 'Child User', role: 'CHILD' }),
  ]

  const mockTemplates = [
    mockTemplate({ id: 1, title: 'Clean Room', points: 10 }),
    mockTemplate({ id: 2, title: 'Do Dishes', points: 15 }),
  ]

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    users: mockUsers,
    templates: mockTemplates,
    loading: false,
  }

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSubmit.mockClear()
  })

  it('renders modal when open', () => {
    render(<ChoreForm {...defaultProps} />)
    expect(screen.getByText('Create Assignment')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ChoreForm {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Create Assignment')).not.toBeInTheDocument()
  })

  it('shows Edit Assignment title when editing', () => {
    const assignment = mockChoreAssignment()
    render(<ChoreForm {...defaultProps} assignment={assignment} />)
    expect(screen.getByText('Edit Assignment')).toBeInTheDocument()
  })

  it('renders template select with options', () => {
    render(<ChoreForm {...defaultProps} />)
    expect(screen.getByText('Select a chore definition')).toBeInTheDocument()
    expect(screen.getByText('Clean Room (10 pts)')).toBeInTheDocument()
    expect(screen.getByText('Do Dishes (15 pts)')).toBeInTheDocument()
  })

  it('renders user select with options', () => {
    render(<ChoreForm {...defaultProps} />)
    expect(screen.getByText('Select a family member')).toBeInTheDocument()
    expect(screen.getByText('Parent User (PARENT)')).toBeInTheDocument()
    expect(screen.getByText('Child User (CHILD)')).toBeInTheDocument()
  })

  it('renders due date input', () => {
    render(<ChoreForm {...defaultProps} />)
    expect(screen.getByLabelText('Due Date')).toBeInTheDocument()
  })

  it('renders Cancel and Create buttons', () => {
    render(<ChoreForm {...defaultProps} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('shows Update button when editing', () => {
    const assignment = mockChoreAssignment()
    render(<ChoreForm {...defaultProps} assignment={assignment} />)
    expect(screen.getByText('Update')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    render(<ChoreForm {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSubmit with form data when submitted', async () => {
    const { container } = render(<ChoreForm {...defaultProps} />)
    
    // Select template
    const selects = container.querySelectorAll('select')
    fireEvent.change(selects[0], { target: { value: '1' } })
    
    // Select user
    fireEvent.change(selects[1], { target: { value: '2' } })
    
    // Set due date
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: '2024-12-31' },
    })
    
    // Submit form
    fireEvent.click(screen.getByText('Create'))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        choreTemplateId: 1,
        assignedToId: 2,
        dueDate: '2024-12-31',
      })
    })
  })

  it('does not submit when required fields are empty', async () => {
    render(<ChoreForm {...defaultProps} />)
    fireEvent.click(screen.getByText('Create'))
    
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  it('calls onClose after successful submit', async () => {
    const { container } = render(<ChoreForm {...defaultProps} />)
    
    // Fill form
    const selects = container.querySelectorAll('select')
    fireEvent.change(selects[0], { target: { value: '1' } })
    fireEvent.change(selects[1], { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: '2024-12-31' },
    })
    
    fireEvent.click(screen.getByText('Create'))
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('populates form with assignment data when editing', () => {
    const assignment = mockChoreAssignment({
      choreTemplateId: 2,
      assignedToId: 2,
      dueDate: '2024-12-31T00:00:00.000Z',
    })
    render(<ChoreForm {...defaultProps} assignment={assignment} />)
    
    expect(screen.getByText('Edit Assignment')).toBeInTheDocument()
  })

  it('disables buttons when loading', () => {
    render(<ChoreForm {...defaultProps} loading={true} />)
    expect(screen.getByText('Cancel')).toBeDisabled()
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('shows loading spinner on submit button when loading', () => {
    render(<ChoreForm {...defaultProps} loading={true} />)
    const submitButton = screen.getByRole('button', { name: /create/i })
    const spinner = submitButton.querySelector('svg.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
