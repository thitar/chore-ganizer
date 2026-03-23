import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { Button } from '../common'
import { notificationsApi } from '../../api'
import { NOTIFICATION_POLL_INTERVAL_MS } from '../../constants'

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getAll({ unreadOnly: true })
      setUnreadCount(response.data.notifications.length)
    } catch (err) {
      // Silently fail - notification count is not critical
      console.error('Failed to load notification count:', err)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount()
      // Poll for new notifications
      const interval = setInterval(loadUnreadCount, NOTIFICATION_POLL_INTERVAL_MS)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, loadUnreadCount])

  if (!isAuthenticated) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Chore-Ganizer</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <button
              className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/profile')}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 hover:text-blue-600">{user?.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Points:</span>
              <span className="text-sm font-bold text-blue-600">{user?.points}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
