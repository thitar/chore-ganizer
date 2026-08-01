import { StrictMode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../components/ui/Modal'

describe('Modal', () => {
  it('sets the open attribute when open is true', () => {
    const { container } = render(
      <Modal open onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>
    )
    expect(container.querySelector('dialog')).toHaveAttribute('open')
  })

  it('removes the open attribute when open becomes false', () => {
    const { container, rerender } = render(
      <Modal open onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>
    )
    rerender(<Modal open={false} onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>)
    expect(container.querySelector('dialog')).not.toHaveAttribute('open')
  })

  it('does not throw under StrictMode double-invoked effects (idempotency guard)', () => {
    expect(() =>
      render(
        <StrictMode>
          <Modal open onClose={vi.fn()} title="Test Modal"><p>Body</p></Modal>
        </StrictMode>
      )
    ).not.toThrow()
  })

  it('calls onClose when the dialog fires a native close event (ESC/programmatic)', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal open onClose={onClose} title="Test Modal"><p>Body</p></Modal>)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop (the dialog element itself) is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose} title="Test Modal"><button>Inside</button></Modal>
    )
    fireEvent.click(container.querySelector('dialog')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking modal content', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test Modal"><button>Inside</button></Modal>)
    fireEvent.click(screen.getByText('Inside'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('gives the dialog an accessible name via aria-labelledby', () => {
    const { container } = render(
      <Modal open onClose={vi.fn()} title="Assign Chore"><p>Body</p></Modal>
    )
    const dialog = container.querySelector('dialog')!
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)).toHaveTextContent('Assign Chore')
  })
})
