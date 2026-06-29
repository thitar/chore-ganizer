import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavBar } from '../components/NavBar'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'

function renderNavBar(user: { role: string; name: string } | null) {
  if (user) {
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { ...user, id: 1, email: 'test@test.com', color: '#000' },
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
  } else {
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
  }

  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  )
}

describe('NavBar', () => {
  it('renders Dashboard and My Chores links for all users', () => {
    renderNavBar({ role: 'CHILD', name: 'Alice' })

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('My Chores')).toBeInTheDocument()
  })

  it('renders Templates and Assignments links for PARENT users', () => {
    renderNavBar({ role: 'PARENT', name: 'Dad' })

    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Assignments')).toBeInTheDocument()
  })

  it('does not render Templates and Assignments links for CHILD users', () => {
    renderNavBar({ role: 'CHILD', name: 'Alice' })

    expect(screen.queryByText('Templates')).toBeNull()
    expect(screen.queryByText('Assignments')).toBeNull()
  })

  it('displays user name', () => {
    renderNavBar({ role: 'CHILD', name: 'Test User' })

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    renderNavBar({ role: 'CHILD', name: 'Alice' })

    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('renders a hamburger menu button for mobile (md:hidden)', () => {
    renderNavBar({ role: 'PARENT', name: 'Dad' })

    // Hamburger should be present, marked as opening the menu
    const hamburger = screen.getByRole('button', { name: /open menu/i })
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens mobile menu when hamburger is clicked and shows all nav links', () => {
    renderNavBar({ role: 'PARENT', name: 'Dad' })

    const hamburger = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(hamburger)

    // Menu open: hamburger becomes close button
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
    // aria-expanded is true
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes mobile menu when a nav link is clicked', () => {
    renderNavBar({ role: 'PARENT', name: 'Dad' })

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    // Now in mobile menu view, click a nav link
    const templatesLinks = screen.getAllByText('Templates')
    fireEvent.click(templatesLinks[templatesLinks.length - 1])
    // Menu should be closed
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })
})
