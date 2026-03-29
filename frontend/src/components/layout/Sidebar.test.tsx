import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { fireEvent } from '@testing-library/react'

vi.mock('../../hooks', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../hooks'
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders common menu items for parent', () => {
    mockUseAuth.mockReturnValue({ isParent: true })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chores')).toBeInTheDocument()
    expect(screen.getByText('Recurring Chores')).toBeInTheDocument()
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('renders parent-only menu items for parent', () => {
    mockUseAuth.mockReturnValue({ isParent: true })
    render(<Sidebar />)
    expect(screen.getByText('Family Calendar')).toBeInTheDocument()
    expect(screen.getByText('Chore Definitions')).toBeInTheDocument()
    expect(screen.getByText('Family Members')).toBeInTheDocument()
  })

  it('renders common menu items for child', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chores')).toBeInTheDocument()
    expect(screen.getByText('Recurring Chores')).toBeInTheDocument()
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('does not render parent-only menu items for child', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    render(<Sidebar />)
    expect(screen.queryByText('Family Calendar')).not.toBeInTheDocument()
    expect(screen.queryByText('Chore Definitions')).not.toBeInTheDocument()
    expect(screen.queryByText('Family Members')).not.toBeInTheDocument()
  })

  it('renders links with correct hrefs', () => {
    mockUseAuth.mockReturnValue({ isParent: true })
    render(<Sidebar />)
    expect(screen.getAllByText('Dashboard')[0].closest('a')).toHaveAttribute('href', '/dashboard')
    expect(screen.getAllByText('Chores')[0].closest('a')).toHaveAttribute('href', '/chores')
    expect(screen.getAllByText('Pocket Money')[0].closest('a')).toHaveAttribute('href', '/pocket-money')
  })

  it('calls onClose when a link is clicked', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    const onClose = vi.fn()
    render(<Sidebar isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getAllByText('Dashboard')[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked (mobile drawer)', () => {
    expect.hasAssertions()
    mockUseAuth.mockReturnValue({ isParent: false })
    const onClose = vi.fn()
    const { container } = render(<Sidebar isOpen={true} onClose={onClose} />)
    const backdrop = container.querySelector('.bg-black\\/40')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })
})
