import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { Navbar } from './Navbar'

// Mock useAuth hook
vi.mock('../../hooks', () => ({
  useAuth: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { useAuth } from '../../hooks'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

describe('Navbar', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    mockNavigate.mockClear()
    mockLogout.mockClear()
  })

  it('does not render when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
      isAuthenticated: false,
    })
    render(<Navbar />)
    expect(screen.queryByText('Chore-Ganizer')).not.toBeInTheDocument()
  })

  it('renders when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('Chore-Ganizer')).toBeInTheDocument()
  })

  it('displays user name', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('displays user points', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('displays user initial in avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('calls logout when logout button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    fireEvent.click(screen.getByText('Logout'))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('navigates to profile when user info is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    fireEvent.click(screen.getByText('Test User'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
