import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './ui/Avatar'

const MAIN_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/my-chores', label: 'My Chores' },
  { to: '/points', label: 'Points' },
  { to: '/calendar', label: 'Calendar' },
]

export const MANAGE_LINKS = [
  { to: '/templates', label: 'Templates' },
  { to: '/recurring-chores', label: 'Recurring' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/users', label: 'Users' },
]

export function TopNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [manageOpen, setManageOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isParent = user?.role === 'PARENT'

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setManageOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function linkClass(path: string) {
    return location.pathname === path
      ? 'bg-surface-raised text-zinc-100'
      : 'text-zinc-400 hover:text-zinc-100'
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-edge bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="shrink-0 bg-gradient-to-r from-accent to-accent-to bg-clip-text font-display text-xl font-bold text-transparent"
        >
          Chore-Ganizer
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {MAIN_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium transition-colors ${linkClass(l.to)}`}
            >
              {l.label}
            </Link>
          ))}
          {isParent && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setManageOpen(o => !o)}
                aria-expanded={manageOpen}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-medium text-zinc-400 hover:text-zinc-100"
              >
                Manage <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              {manageOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-edge bg-surface-raised py-1 shadow-lg">
                  {MANAGE_LINKS.map(l => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setManageOpen(false)}
                      className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user && (
            <Link to="/profile" className="flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm text-zinc-300 hover:text-zinc-100">
              <Avatar name={user.name} color={user.color ?? '#8B5CF6'} size="sm" />
              {user.name}
            </Link>
          )}
          <button
            onClick={() => logout()}
            aria-label="Logout"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile: wordmark + logout only; navigation lives in BottomTabBar */}
        <button
          onClick={() => logout()}
          aria-label="Logout"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-zinc-500 md:hidden"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  )
}
