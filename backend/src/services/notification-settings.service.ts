import prisma from '../config/database.js'
import { sendNtfyNotification, NotificationPriorities, NotificationTags, NotificationType } from './ntfy.service.js'

export interface UserNotificationSettingsData {
  ntfyTopic?: string
  ntfyServerUrl?: string
  ntfyUsername?: string
  ntfyPassword?: string
  notifyChoreAssigned?: boolean
  notifyChoreDueSoon?: boolean
  notifyChoreCompleted?: boolean
  notifyChoreOverdue?: boolean
  notifyPointsEarned?: boolean
  reminderHoursBefore?: number
  quietHoursStart?: number
  quietHoursEnd?: number
  // Overdue penalty settings
  overduePenaltyEnabled?: boolean
  overduePenaltyMultiplier?: number
  notifyParentOnOverdue?: boolean
}

export interface NotificationSettings {
  id: number
  userId: number
  ntfyTopic: string | null
  ntfyServerUrl: string | null
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
}

/**
 * Get default notification settings from environment variables
 */
export const getDefaultSettings = () => ({
  ntfyServerUrl: process.env.NTFY_DEFAULT_SERVER_URL || 'https://ntfy.sh',
  ntfyTopic: process.env.NTFY_DEFAULT_TOPIC || null,
  ntfyUsername: process.env.NTFY_DEFAULT_USERNAME || null,
  ntfyPassword: process.env.NTFY_DEFAULT_PASSWORD || null,
  notifyChoreAssigned: process.env.NTFY_DEFAULT_NOTIFY_CHORE_ASSIGNED !== 'false',
  notifyChoreDueSoon: process.env.NTFY_DEFAULT_NOTIFY_CHORE_DUE_SOON !== 'false',
  notifyChoreCompleted: process.env.NTFY_DEFAULT_NOTIFY_CHORE_COMPLETED !== 'false',
  notifyChoreOverdue: process.env.NTFY_DEFAULT_NOTIFY_CHORE_OVERDUE !== 'false',
  notifyPointsEarned: process.env.NTFY_DEFAULT_NOTIFY_POINTS_EARNED !== 'false',
  reminderHoursBefore: parseInt(process.env.NTFY_DEFAULT_REMINDER_HOURS || '2', 10),
  quietHoursStart: process.env.NTFY_DEFAULT_QUIET_HOURS_START 
    ? parseInt(process.env.NTFY_DEFAULT_QUIET_HOURS_START, 10) 
    : null,
  quietHoursEnd: process.env.NTFY_DEFAULT_QUIET_HOURS_END 
    ? parseInt(process.env.NTFY_DEFAULT_QUIET_HOURS_END, 10) 
    : null,
  // Overdue penalty defaults
  overduePenaltyEnabled: process.env.OVERDUE_PENALTY_ENABLED !== 'false',
  overduePenaltyMultiplier: parseInt(process.env.OVERDUE_PENALTY_MULTIPLIER || '2', 10),
  notifyParentOnOverdue: process.env.NOTIFY_PARENT_ON_OVERDUE !== 'false',
})

/**
 * Get notification settings for a user
 * Creates default settings if none exist
 */
export const getOrCreateSettings = async (userId: number): Promise<NotificationSettings> => {
  let settings = await prisma.userNotificationSettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    // Create default settings from environment variables
    const defaults = getDefaultSettings()
    settings = await prisma.userNotificationSettings.create({
      data: { 
        userId,
        ntfyServerUrl: defaults.ntfyServerUrl,
        ntfyTopic: defaults.ntfyTopic,
        ntfyUsername: defaults.ntfyUsername,
        ntfyPassword: defaults.ntfyPassword,
        notifyChoreAssigned: defaults.notifyChoreAssigned,
        notifyChoreDueSoon: defaults.notifyChoreDueSoon,
        notifyChoreCompleted: defaults.notifyChoreCompleted,
        notifyChoreOverdue: defaults.notifyChoreOverdue,
        notifyPointsEarned: defaults.notifyPointsEarned,
        reminderHoursBefore: defaults.reminderHoursBefore,
        quietHoursStart: defaults.quietHoursStart,
        quietHoursEnd: defaults.quietHoursEnd,
        overduePenaltyEnabled: defaults.overduePenaltyEnabled,
        overduePenaltyMultiplier: defaults.overduePenaltyMultiplier,
        notifyParentOnOverdue: defaults.notifyParentOnOverdue,
      },
    })
  }

  return settings
}

/**
 * Update notification settings for a user
 */
export const updateSettings = async (
  userId: number,
  data: UserNotificationSettingsData
): Promise<NotificationSettings> => {
  // Check if settings exist, create if not
  const existing = await prisma.userNotificationSettings.findUnique({
    where: { userId },
  })

  if (existing) {
    return prisma.userNotificationSettings.update({
      where: { userId },
      data,
    })
  } else {
    // Create with defaults and override with provided data
    const defaults = getDefaultSettings()
    return prisma.userNotificationSettings.create({
      data: {
        userId,
        ntfyServerUrl: data.ntfyServerUrl ?? defaults.ntfyServerUrl,
        ntfyTopic: data.ntfyTopic ?? defaults.ntfyTopic,
        ntfyUsername: data.ntfyUsername ?? defaults.ntfyUsername,
        ntfyPassword: data.ntfyPassword ?? defaults.ntfyPassword,
        notifyChoreAssigned: data.notifyChoreAssigned ?? defaults.notifyChoreAssigned,
        notifyChoreDueSoon: data.notifyChoreDueSoon ?? defaults.notifyChoreDueSoon,
        notifyChoreCompleted: data.notifyChoreCompleted ?? defaults.notifyChoreCompleted,
        notifyChoreOverdue: data.notifyChoreOverdue ?? defaults.notifyChoreOverdue,
        notifyPointsEarned: data.notifyPointsEarned ?? defaults.notifyPointsEarned,
        reminderHoursBefore: data.reminderHoursBefore ?? defaults.reminderHoursBefore,
        quietHoursStart: data.quietHoursStart ?? defaults.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd ?? defaults.quietHoursEnd,
        overduePenaltyEnabled: data.overduePenaltyEnabled ?? defaults.overduePenaltyEnabled,
        overduePenaltyMultiplier: data.overduePenaltyMultiplier ?? defaults.overduePenaltyMultiplier,
        notifyParentOnOverdue: data.notifyParentOnOverdue ?? defaults.notifyParentOnOverdue,
      },
    })
  }
}

/**
 * Check if we're in quiet hours for a user
 */
export const isInQuietHours = (settings: NotificationSettings): boolean => {
  if (settings.quietHoursStart === null || settings.quietHoursEnd === null) {
    return false
  }

  const now = new Date()
  const currentHour = now.getHours()

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (settings.quietHoursStart > settings.quietHoursEnd) {
    return currentHour >= settings.quietHoursStart || currentHour < settings.quietHoursEnd
  }

  // Same-day quiet hours (e.g., 14:00 - 16:00)
  return currentHour >= settings.quietHoursStart && currentHour < settings.quietHoursEnd
}

/**
 * Send a push notification to a user if they have it configured
 */
export const sendPushNotification = async (
  userId: number,
  type: NotificationType,
  context: {
    choreTitle?: string
    userName?: string
    dueDate?: string
    hoursLeft?: number
    daysOverdue?: number
    points?: number
    totalPoints?: number
  }
): Promise<boolean> => {
  // Get user settings
  const settings = await getOrCreateSettings(userId)

  // Check if user has ntfy configured (use defaults if not set)
  const defaults = getDefaultSettings()
  const ntfyTopic = settings.ntfyTopic || defaults.ntfyTopic
  const ntfyServerUrl = settings.ntfyServerUrl || defaults.ntfyServerUrl
  const ntfyUsername = settings.ntfyUsername || defaults.ntfyUsername
  const ntfyPassword = settings.ntfyPassword || defaults.ntfyPassword

  if (!ntfyTopic || !ntfyServerUrl) {
    return false
  }

  // Check if this notification type is enabled
  const typeEnabledMap: Record<NotificationType, boolean> = {
    CHORE_ASSIGNED: settings.notifyChoreAssigned,
    CHORE_DUE_SOON: settings.notifyChoreDueSoon,
    CHORE_COMPLETED: settings.notifyChoreCompleted,
    CHORE_OVERDUE: settings.notifyChoreOverdue,
    POINTS_EARNED: settings.notifyPointsEarned,
  }

  if (!typeEnabledMap[type]) {
    return false
  }

  // Check quiet hours
  if (isInQuietHours(settings)) {
    console.log(`[NotificationSettings] Skipping notification due to quiet hours for user ${userId}`)
    return false
  }

  // Build notification content
  let title: string
  let message: string

  switch (type) {
    case 'CHORE_ASSIGNED':
      title = `New Chore Assigned: ${context.choreTitle || 'Chore'}`
      message = `You have been assigned "${context.choreTitle || 'Chore'}" due on ${context.dueDate || 'soon'}`
      break
    case 'CHORE_DUE_SOON':
      title = `Reminder: ${context.choreTitle || 'Chore'} Due Soon`
      message = `"${context.choreTitle || 'Chore'}" is due in ${context.hoursLeft || 2} hours`
      break
    case 'CHORE_COMPLETED':
      title = `${context.userName || 'Someone'} completed: ${context.choreTitle || 'Chore'}`
      message = `${context.userName || 'Someone'} has completed "${context.choreTitle || 'Chore'}" and earned ${context.points || 0} points!`
      break
    case 'CHORE_OVERDUE':
      title = `Overdue: ${context.choreTitle || 'Chore'}`
      message = `"${context.choreTitle || 'Chore'}" is ${context.daysOverdue || 1} day(s) overdue`
      break
    case 'POINTS_EARNED':
      title = `You earned ${context.points || 0} points!`
      message = `You earned points for completing "${context.choreTitle || 'Chore'}". Total: ${context.totalPoints || 0} points`
      break
    default:
      return false
  }

  // Send the notification
  return sendNtfyNotification({
    serverUrl: ntfyServerUrl,
    topic: ntfyTopic,
    title,
    message,
    priority: NotificationPriorities[type],
    tags: [...NotificationTags[type]],
    username: ntfyUsername || undefined,
    password: ntfyPassword || undefined,
  })
}

/**
 * Send test notification to verify ntfy configuration
 */
export const sendTestNotification = async (userId: number): Promise<boolean> => {
  const settings = await getOrCreateSettings(userId)

  // Use user settings or fall back to defaults
  const defaults = getDefaultSettings()
  const ntfyTopic = settings.ntfyTopic || defaults.ntfyTopic
  const ntfyServerUrl = settings.ntfyServerUrl || defaults.ntfyServerUrl
  const ntfyUsername = settings.ntfyUsername || defaults.ntfyUsername
  const ntfyPassword = settings.ntfyPassword || defaults.ntfyPassword

  if (!ntfyTopic || !ntfyServerUrl) {
    return false
  }

  return sendNtfyNotification({
    serverUrl: ntfyServerUrl,
    topic: ntfyTopic,
    title: 'Test Notification',
    message: 'This is a test notification from Chore-Ganizer! Your notifications are working correctly.',
    priority: 3,
    tags: ['test', 'white_check_mark'],
    username: ntfyUsername || undefined,
    password: ntfyPassword || undefined,
  })
}
