import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { Modal } from './Modal'

describe('Modal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  afterEach(() => {
    document.body.style.overflow = 'unset'
  })

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={mockOnClose}><div>Modal Content</div></Modal>)
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(<Modal isOpen={true} onClose={mockOnClose}><div>Modal Content</div></Modal>)
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Modal isOpen={true} onClose={mockOnClose} title="Test Modal"><div>Content</div></Modal>)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(<Modal isOpen={true} onClose={mockOnClose}><div>Content</div></Modal>)
    const backdrop = screen.getByText('Content').closest('.fixed.inset-0.z-50')
      ?.querySelector('.fixed.inset-0.bg-black\\/50')
    expect(backdrop).not.toBeNull()
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('calls onClose when close button is clicked', () => {
    render(<Modal isOpen={true} onClose={mockOnClose} title="Test Modal"><div>Content</div></Modal>)
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('sets body overflow to hidden when open', () => {
    render(<Modal isOpen={true} onClose={mockOnClose}><div>Content</div></Modal>)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('resets body overflow when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose}><div>Content</div></Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<Modal isOpen={false} onClose={mockOnClose}><div>Content</div></Modal>)
    expect(document.body.style.overflow).toBe('unset')
  })

  it('applies size classes correctly', () => {
    const { rerender, container } = render(
      <Modal isOpen={true} onClose={mockOnClose} size="sm"><div>Content</div></Modal>
    )
    const panel = container.querySelector('.bg-white.rounded-xl')
    expect(panel).toHaveClass('max-w-sm')

    rerender(<Modal isOpen={true} onClose={mockOnClose} size="lg"><div>Content</div></Modal>)
    expect(container.querySelector('.bg-white.rounded-xl')).toHaveClass('max-w-lg')

    rerender(<Modal isOpen={true} onClose={mockOnClose} size="xl"><div>Content</div></Modal>)
    expect(container.querySelector('.bg-white.rounded-xl')).toHaveClass('max-w-xl')
  })

  it('renders children correctly', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <button>Action Button</button>
      </Modal>
    )
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
  })
})
