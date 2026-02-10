import React from 'react'
import { useAuth } from '../../hooks'
import { Button } from '../common'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { isParent } = useAuth()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'chores', label: 'Chores', icon: '📋' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ]

  if (isParent) {
    menuItems.push({ id: 'users', label: 'Family Members', icon: '👨‍👩‍👧‍👦' })
  }

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? 'primary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onPageChange(item.id)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
    </aside>
  )
}
