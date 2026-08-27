import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('renders Pending for PENDING', () => {
    render(<StatusBadge status="PENDING" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders Completed for COMPLETED', () => {
    render(<StatusBadge status="COMPLETED" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders Cancelled for CANCELLED', () => {
    render(<StatusBadge status="CANCELLED" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('renders Partially Complete for PARTIALLY_COMPLETE', () => {
    render(<StatusBadge status="PARTIALLY_COMPLETE" />)
    expect(screen.getByText('Partially Complete')).toBeInTheDocument()
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })

  it('renders Overdue when overdue flag is set on a PENDING chore', () => {
    render(<StatusBadge status="PENDING" overdue />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })
})
