import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const DashboardIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const ChoresIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
)

const RecurringIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
  </svg>
)

const TemplatesIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const PocketMoneyIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const StatisticsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

const ICON_MAP: Record<string, React.FC> = {
  dashboard: DashboardIcon,
  calendar: CalendarIcon,
  chores: ChoresIcon,
  'recurring-chores': RecurringIcon,
  templates: TemplatesIcon,
  users: UsersIcon,
  'pocket-money': PocketMoneyIcon,
  statistics: StatisticsIcon,
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { isParent } = useAuth()
  const location = useLocation()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    ...(isParent ? [{ id: 'calendar', label: 'Family Calendar' }] : []),
    { id: 'chores', label: 'Chores' },
    { id: 'recurring-chores', label: 'Recurring Chores' },
    ...(isParent ? [{ id: 'templates', label: 'Chore Definitions' }] : []),
    ...(isParent ? [{ id: 'users', label: 'Family Members' }] : []),
    { id: 'pocket-money', label: 'Pocket Money' },
    ...(isParent ? [{ id: 'statistics', label: 'Statistics' }] : []),
  ]

  const nav = (
    <aside className="w-64 bg-sidebar min-h-screen flex-shrink-0 border-r border-sidebar-border">
      <div className="p-3 pt-4">
        <div className="text-sidebar-foreground text-xs font-bold uppercase tracking-widest px-3 pb-3">
          Menu
        </div>
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = ICON_MAP[item.id]
            const isActive = location.pathname === `/${item.id}`
            return (
              <Link
                key={item.id}
                to={`/${item.id}`}
                onClick={onClose}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-primary text-white'
                    : 'text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-active'}
                `}
              >
                {Icon && <Icon />}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:block">{nav}</div>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50">{nav}</div>
        </div>
      )}
    </>
  )
}
