import React, { useState, useEffect } from 'react'
import { notificationsApi } from '../api'
import type { Notification } from '../types'
import { Loading } from '../components/common'

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingRead, setMarkingRead] = useState<number | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [showUnreadOnly])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await notificationsApi.getAll({ unreadOnly: showUnreadOnly })
      setNotifications(response.data.notifications)
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      setMarkingRead(id)
      await notificationsApi.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to mark notification as read')
    } finally {
      setMarkingRead(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setError(null)
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to mark all as read')
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'CHORE_ASSIGNED':
        return '📋'
      case 'CHORE_COMPLETED':
        return '✅'
      case 'POINTS_EARNED':
        return '⭐'
      case 'OVERDUE_CHORE':
        return '⚠️'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: Notification['type'], read: boolean) => {
    if (read) return 'bg-gray-50'
    switch (type) {
      case 'OVERDUE_CHORE':
        return 'bg-red-50'
      case 'CHORE_COMPLETED':
        return 'bg-green-50'
      case 'POINTS_EARNED':
        return 'bg-yellow-50'
      default:
        return 'bg-white'
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const totalCount = notifications.length

  if (loading) {
    return <Loading text="Loading notifications..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'No unread notifications'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Show unread only
          </label>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {totalCount === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
          </h2>
          <p className="text-gray-600">
            {showUnreadOnly
              ? 'You have read all your notifications.'
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 flex items-start gap-4 ${getNotificationColor(
                  notification.type,
                  notification.read
                )}`}
              >
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-semibold ${
                        notification.read ? 'text-gray-700' : 'text-gray-900'
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markingRead === notification.id}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {markingRead === notification.id ? 'Marking...' : 'Mark as read'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications
