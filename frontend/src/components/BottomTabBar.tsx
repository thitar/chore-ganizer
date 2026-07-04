import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Home, ListChecks, Settings, Star, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { MANAGE_LINKS } from './TopNav'

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/my-chores', label: 'Chores', icon: ListChecks },
  { to: '/points', label: 'Points', icon: Star },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: User },
]

export function BottomTabBar() {
  const { user } = useAuth()
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const manageTriggerRef = useRef<HTMLButtonElement>(null)
  const isParent = user?.role === 'PARENT'

  useEffect(() => {
    if (!sheetOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSheetOpen(false)
        manageTriggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sheetOpen])

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-x-2 bottom-16 animate-fade-up rounded-2xl border border-edge bg-surface-raised p-2"
            onClick={e => e.stopPropagation()}
          >
            {MANAGE_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setSheetOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm text-zinc-200 hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-bg/90 backdrop-blur md:hidden">
        <div className="grid auto-cols-fr grid-flow-col">
          {TABS.map(t => {
            const active = location.pathname === t.to
            const Icon = t.icon
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex min-h-[56px] flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-accent' : 'text-zinc-500'}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t.label}
              </Link>
            )
          })}
          {isParent && (
            <button
              ref={manageTriggerRef}
              onClick={() => setSheetOpen(o => !o)}
              className={`flex min-h-[56px] flex-col items-center gap-0.5 py-2 text-[11px] ${sheetOpen ? 'text-accent' : 'text-zinc-500'}`}
            >
              <Settings className="h-5 w-5" aria-hidden />
              Manage
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
