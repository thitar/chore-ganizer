import React from 'react'
import { useAuth } from '../../hooks'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { isParent } = useAuth()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'chores', label: 'Chores', icon: '📋' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ]

  if (isParent) {
    menuItems.push({ id: 'users', label: 'Family Members', icon: '👨‍👩‍👧‍👦' })
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen shadow-sm">
      <div className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                transition-all duration-200 font-medium
                ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}
