import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AssignChoreForm } from '../components/AssignChoreForm'

const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../hooks/useAssignments', () => ({ useAssignments: vi.fn() }))
vi.mock('../hooks/useTemplates', () => ({ useTemplates: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const defaultAssignment = {
  id: 1,
  choreTemplateId: 1,
  assignedToId: 2,
  dueDate: '2026-06-15',
  status: 'PENDING' as const,
  completedAt: null,
  pointsAwarded: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen', description: null },
  assignedTo: { id: 2, name: 'Alice', color: '#10B981', ntfyTopic: null },
}

function mockState(overrides: {
  assignments?: Record<string, unknown>
  templates?: unknown[]
  users?: unknown[]
} = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    createAssignment: mockCreate,
    updateAssignment: mockUpdate,
    isCreating: false,
    isUpdating: false,
    ...overrides.assignments,
  })
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({
    templates: overrides.templates ?? [
      { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen', description: null, createdById: 1, createdAt: '', updatedAt: '' },
    ],
  })
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({
    users: overrides.users ?? [{ id: 2, name: 'Alice', role: 'CHILD', color: '#10B981' }],
  })
}

describe('AssignChoreForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState()
  })

  it('renders create mode with an editable template select', () => {
    render(<AssignChoreForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Template')).not.toBeDisabled()
    expect(screen.getByLabelText('Assign To')).toBeInTheDocument()
    expect(screen.getByLabelText('Due Date')).toBeInTheDocument()
  })

  it('submits the create payload and calls onSuccess', async () => {
    mockCreate.mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<AssignChoreForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assign To'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-01' } })
    fireEvent.click(screen.getByText('Save Assignment'))

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ templateId: 1, userId: 2, dueDate: '2026-07-01' })
    )
    expect(onSuccess).toHaveBeenCalledWith('Assignment created!')
  })

  it('renders edit mode with a disabled, pre-filled template select', () => {
    render(<AssignChoreForm assignment={defaultAssignment} onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const templateSelect = screen.getByLabelText('Template') as HTMLSelectElement
    expect(templateSelect).toBeDisabled()
    expect(templateSelect.value).toBe('1')
  })

  it('submits the update payload without templateId and calls onSuccess', async () => {
    mockUpdate.mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<AssignChoreForm assignment={defaultAssignment} onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-05' } })
    fireEvent.click(screen.getByText('Save Assignment'))

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(1, { userId: 2, dueDate: '2026-07-05' })
    )
    expect(onSuccess).toHaveBeenCalledWith('Assignment updated!')
  })

  it('shows an inline error and stays open when submit fails', async () => {
    mockCreate.mockRejectedValue(new Error('network error'))
    render(<AssignChoreForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assign To'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-01' } })
    fireEvent.click(screen.getByText('Save Assignment'))

    expect(await screen.findByText('Failed to save assignment. Please try again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Template')).toBeInTheDocument()
  })

  it('calls onCancel when Discard changes is clicked', () => {
    const onCancel = vi.fn()
    render(<AssignChoreForm onSuccess={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Discard changes'))
    expect(onCancel).toHaveBeenCalled()
  })
})
