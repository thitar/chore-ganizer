import { useState, useEffect } from 'react'
import { notificationsApi } from '../api'
import type { Notification } from '../types'

export function useNotifications(unreadOnly: boolean = false) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await notificationsApi.getAll({ unreadOnly })
      setNotifications(response.data.notifications)
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to fetch notifications'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [unreadOnly])

  const markAsRead = async (id: number) => {
    try {
      setError(null)
      const response = await notificationsApi.markAsRead(id)
      setNotifications(notifications.map((n) => (n.id === id ? response.data.notification : n)))
      return { success: true }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to mark notification as read'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const markAllAsRead = async () => {
    try {
      setError(null)
      await notificationsApi.markAllAsRead()
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      return { success: true }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to mark all notifications as read'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      setError(null)
      await notificationsApi.delete(id)
      setNotifications(notifications.filter((n) => n.id !== id))
      return { success: true }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to delete notification'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
    unreadCount,
  }
}
