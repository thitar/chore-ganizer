import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { Button } from '../common'
import { notificationsApi } from '../../api'
import { NOTIFICATION_POLL_INTERVAL_MS } from '../../constants'

interface NavbarProps {
  onMenuOpen?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuOpen }) => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getAll({ unreadOnly: true })
      setUnreadCount(response.data.notifications.length)
    } catch (err) {
      console.error('Failed to load notification count:', err)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount()
      const interval = setInterval(loadUnreadCount, NOTIFICATION_POLL_INTERVAL_MS)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, loadUnreadCount])

  if (!isAuthenticated) {
    return null
  }

  return (
    <nav className="bg-sidebar border-b border-sidebar-border">
      <div className="px-4 sm:px-6">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden flex flex-col gap-1.5 p-1.5 text-sidebar-foreground hover:text-sidebar-active transition-colors"
              onClick={onMenuOpen}
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-current rounded-full" />
              <span className="block w-5 h-0.5 bg-current rounded-full" />
              <span className="block w-5 h-0.5 bg-current rounded-full" />
            </button>
            <h1 className="text-base font-bold text-sidebar-active tracking-tight">Chore-Ganizer</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              className="relative p-1.5 text-sidebar-foreground hover:text-sidebar-active transition-colors"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Points */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-sidebar-foreground">Points:</span>
              <span className="text-xs font-bold text-primary-ring">{user?.points}</span>
            </div>

            {/* User avatar */}
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/profile')}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: user?.color || '#3B82F6' }}
              >
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-sidebar-foreground hover:text-sidebar-active">
                {user?.name}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={logout}
              className="text-sidebar-foreground hover:text-sidebar-active hover:bg-white/10">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
