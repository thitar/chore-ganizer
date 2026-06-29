import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils'
import type { Mock } from 'vitest'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { useAuth } from '../hooks'
import { Settings } from './Settings'

const mockUseAuth = useAuth as Mock

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isParent: true, isAuthenticated: true, loading: false })
  })

  it('renders the settings heading', () => {
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeDefined()
  })

  it('shows link to admin dashboard for parents', () => {
    render(<Settings />)
    const link = screen.getByText('Admin Dashboard')
    expect(link).toBeDefined()
    expect(link.closest('a')).toHaveAttribute('href', '/admin')
  })

  it('shows rate limit monitoring redirect message', () => {
    render(<Settings />)
    expect(screen.getByText(/Rate limit monitoring has moved/)).toBeDefined()
  })

  it('returns null for non-parent users', () => {
    mockUseAuth.mockReturnValue({ isParent: false, isAuthenticated: true, loading: false })
    const { container } = render(<Settings />)
    expect(container.innerHTML).toBe('')
  })
})
