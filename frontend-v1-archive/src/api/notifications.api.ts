import apiClient from './client'
import type { Notification, ApiResponse } from '../types'

export interface NotificationsResponse {
  notifications: Notification[]
}

export interface NotificationResponse {
  notification: Notification
}

export const notificationsApi = {
  getAll: (params?: { unreadOnly?: boolean }) =>
    apiClient.get<{ notifications: Notification[] }>('/notifications', { params }),

  getById: (id: number) =>
    apiClient.get<{ notification: Notification }>(`/notifications/${id}`),

  markAsRead: (id: number) =>
    apiClient.put<{ notification: Notification }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.put<{ message: string }>('/notifications/read-all'),

  delete: (id: number) =>
    apiClient.delete<{ message: string }>(`/notifications/${id}`),

  // Check for overdue chores and create notifications
  checkOverdue: () =>
    apiClient.post<{ count: number }>('/notifications/check-overdue'),
}
