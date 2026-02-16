import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks'

export const Sidebar: React.FC = () => {
  const { isParent } = useAuth()
  const location = useLocation()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    // Global Calendar is parents-only - children see their personal calendar on Dashboard
    ...(isParent ? [{ id: 'calendar', label: 'Family Calendar', icon: '📅' }] : []),
    { id: 'chores', label: 'Chores', icon: '📋' },
    // Templates is parents-only - only parents can create/manage chore templates
    ...(isParent ? [{ id: 'templates', label: 'Templates', icon: '📝' }] : []),
  ]

  if (isParent) {
    menuItems.push({ id: 'users', label: 'Family Members', icon: '👨‍👩‍👧‍👦' })
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen shadow-sm">
      <div className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={`/${item.id}`}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                transition-all duration-200 font-medium
                ${
                  location.pathname === `/${item.id}`
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
