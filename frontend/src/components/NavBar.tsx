import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Menu, X } from 'lucide-react'

export function NavBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  function linkClass(path: string, extra = '') {
    const base = location.pathname === path
      ? 'text-primary font-bold border-b-2 border-primary'
      : 'text-gray-500 hover:text-gray-700'
    return `${base} ${extra}`
  }

  const isParent = user?.role === 'PARENT'

  // All nav links in one flat list, used by both desktop and mobile
  const allLinks = [
    { to: '/', label: 'Dashboard', parent: false },
    { to: '/my-chores', label: 'My Chores', parent: false },
    { to: '/points', label: 'Points', parent: false },
    { to: '/profile', label: 'Profile', parent: false },
    { to: '/calendar', label: 'Calendar', parent: false },
    { to: '/templates', label: 'Templates', parent: true },
    { to: '/recurring-chores', label: 'Recurring', parent: true },
    { to: '/assignments', label: 'Assignments', parent: true },
    { to: '/users', label: 'Users', parent: true },
  ].filter((l) => !l.parent || isParent)

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gray-900 shrink-0">Chore-Ganizer</Link>

        {/* Desktop nav (md+) */}
        <div className="hidden md:flex items-center gap-1">
          {allLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`${linkClass(l.to, 'min-h-[44px] inline-flex items-center px-3')}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop user section */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-gray-600">{user?.name}</span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 min-h-[44px] px-3"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Mobile hamburger (below md) */}
        <button
          className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="flex flex-col px-4 py-2">
            {allLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={`${linkClass(l.to, 'min-h-[44px] flex items-center px-2 py-3 border-b border-gray-100')}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between py-3 border-t border-gray-200 mt-2">
              <span className="text-gray-600">{user?.name}</span>
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="flex items-center gap-1 text-gray-600 hover:text-red-600 min-h-[44px] px-3"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
