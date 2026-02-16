import apiClient from './client'

export interface NotificationSettings {
  id: number
  userId: number
  ntfyTopic: string | null
  ntfyServerUrl: string
  ntfyUsername: string | null
  ntfyPassword: string | null
  notifyChoreAssigned: boolean
  notifyChoreDueSoon: boolean
  notifyChoreCompleted: boolean
  notifyChoreOverdue: boolean
  notifyPointsEarned: boolean
  reminderHoursBefore: number
  quietHoursStart: number | null
  quietHoursEnd: number | null
  // Overdue penalty settings
  overduePenaltyEnabled: boolean
  overduePenaltyMultiplier: number
  notifyParentOnOverdue: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateNotificationSettingsData {
  ntfyTopic?: string | null
  ntfyServerUrl?: string
  ntfyUsername?: string | null
  ntfyPassword?: string | null
  notifyChoreAssigned?: boolean
  notifyChoreDueSoon?: boolean
  notifyChoreCompleted?: boolean
  notifyChoreOverdue?: boolean
  notifyPointsEarned?: boolean
  reminderHoursBefore?: number
  quietHoursStart?: number | null
  quietHoursEnd?: number | null
  // Overdue penalty settings
  overduePenaltyEnabled?: boolean
  overduePenaltyMultiplier?: number
  notifyParentOnOverdue?: boolean
}

export interface TestNotificationResponse {
  success: boolean
  message: string
}

export const notificationSettingsApi = {
  get: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get<{ settings: NotificationSettings }>('/notification-settings')
    return response.data?.settings
  },

  update: async (data: UpdateNotificationSettingsData): Promise<NotificationSettings> => {
    const response = await apiClient.put<{ settings: NotificationSettings }>('/notification-settings', data)
    return response.data?.settings
  },

  sendTest: async (): Promise<TestNotificationResponse> => {
    const response = await apiClient.post<TestNotificationResponse>('/notification-settings/test')
    return response.data
  },
}
