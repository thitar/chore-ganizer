import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TemplatesPage } from '../pages/TemplatesPage'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('../hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useGamification: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
}))

import { useTemplates } from '../hooks/useTemplates'

const defaultTemplate = {
  id: 1,
  title: 'Wash Dishes',
  description: 'Clean them all',
  points: 10,
  category: 'kitchen',
  createdById: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function mockTemplatesState(overrides: Record<string, unknown> = {}) {
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({
    templates: [],
    isLoading: false,
    error: null,
    createTemplate: mockCreate,
    isCreating: false,
    updateTemplate: mockUpdate,
    isUpdating: false,
    deleteTemplate: mockDelete,
    isDeleting: false,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TemplatesPage />
    </MemoryRouter>
  )
}

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton', () => {
    mockTemplatesState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelector('.animate-\\[shimmer_1\\.5s_infinite\\]')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    mockTemplatesState()
    renderPage()
    expect(screen.getByText('No chore templates yet')).toBeInTheDocument()
    expect(screen.getByText('Create Template')).toBeInTheDocument()
  })

  it('renders template list with title, category, and points', () => {
    mockTemplatesState({ templates: [defaultTemplate] })
    renderPage()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getByText('kitchen')).toBeInTheDocument()
    expect(screen.getByText('10 pts')).toBeInTheDocument()
  })

  it('shows create form when Create Template button clicked', () => {
    mockTemplatesState()
    renderPage()
    fireEvent.click(screen.getByText('Create Template'))
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Points')).toBeInTheDocument()
  })

  it('submits create form and calls createTemplate', async () => {
    mockCreate.mockResolvedValue(defaultTemplate)
    mockTemplatesState()
    renderPage()
    fireEvent.click(screen.getByText('Create Template'))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Chore' } })
    fireEvent.change(screen.getByLabelText('Points'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'test' } })
    fireEvent.click(screen.getByText('Save Template'))
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  it('shows edit form with pre-filled values', () => {
    mockTemplatesState({ templates: [defaultTemplate] })
    renderPage()
    fireEvent.click(screen.getByLabelText('Edit template'))
    expect(screen.getByDisplayValue('Wash Dishes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('shows delete confirmation when delete icon clicked', () => {
    mockTemplatesState({ templates: [defaultTemplate] })
    renderPage()
    fireEvent.click(screen.getByLabelText('Delete template'))
    expect(screen.getByText('Delete Template')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    mockTemplatesState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
