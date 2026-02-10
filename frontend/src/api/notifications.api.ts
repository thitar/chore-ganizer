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
    apiClient.get<NotificationsResponse>('/notifications', { params }),

  getById: (id: number) =>
    apiClient.get<NotificationResponse>(`/notifications/${id}`),

  markAsRead: (id: number) =>
    apiClient.put<NotificationResponse>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.put<{ message: string }>('/notifications/read-all'),

  delete: (id: number) =>
    apiClient.delete<{ message: string }>(`/notifications/${id}`),
}
