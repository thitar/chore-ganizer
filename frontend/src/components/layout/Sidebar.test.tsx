import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'

// Mock useAuth hook
vi.mock('../../hooks', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../hooks'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

// Import after mocking
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders common menu items for parent', () => {
    mockUseAuth.mockReturnValue({
      isParent: true,
    })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chores')).toBeInTheDocument()
    expect(screen.getByText('Recurring Chores')).toBeInTheDocument()
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('renders parent-only menu items for parent', () => {
    mockUseAuth.mockReturnValue({
      isParent: true,
    })
    render(<Sidebar />)
    expect(screen.getByText('Family Calendar')).toBeInTheDocument()
    expect(screen.getByText('Chore Definitions')).toBeInTheDocument()
    expect(screen.getByText('Family Members')).toBeInTheDocument()
  })

  it('renders common menu items for child', () => {
    mockUseAuth.mockReturnValue({
      isParent: false,
    })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chores')).toBeInTheDocument()
    expect(screen.getByText('Recurring Chores')).toBeInTheDocument()
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('does not render parent-only menu items for child', () => {
    mockUseAuth.mockReturnValue({
      isParent: false,
    })
    render(<Sidebar />)
    expect(screen.queryByText('Family Calendar')).not.toBeInTheDocument()
    expect(screen.queryByText('Chore Definitions')).not.toBeInTheDocument()
    expect(screen.queryByText('Family Members')).not.toBeInTheDocument()
  })

  it('renders menu items with icons', () => {
    mockUseAuth.mockReturnValue({
      isParent: true,
    })
    render(<Sidebar />)
    expect(screen.getByText('📊')).toBeInTheDocument()
    expect(screen.getByText('📅')).toBeInTheDocument()
    expect(screen.getByText('📋')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument()
    expect(screen.getByText('📝')).toBeInTheDocument()
    expect(screen.getByText('👨‍👩‍👧‍👦')).toBeInTheDocument()
    expect(screen.getByText('💰')).toBeInTheDocument()
  })

  it('renders sidebar with correct width', () => {
    mockUseAuth.mockReturnValue({
      isParent: true,
    })
    const { container } = render(<Sidebar />)
    const sidebar = container.querySelector('aside')
    expect(sidebar).toHaveClass('w-64')
  })

  it('renders links with correct hrefs', () => {
    mockUseAuth.mockReturnValue({
      isParent: true,
    })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('Chores').closest('a')).toHaveAttribute('href', '/chores')
    expect(screen.getByText('Pocket Money').closest('a')).toHaveAttribute('href', '/pocket-money')
  })
})
