import prisma from '../config/database.js'
import { sendNtfyNotification, NotificationPriorities, NotificationTags, NotificationType } from './ntfy.service.js'
import { sendChoreAssignedEmail, sendChoreCompletedEmail, sendPointsEarnedEmail } from './emailService.js'
import { logger } from '../utils/logger.js'

export interface NotificationPayload {
  userId: number
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export interface ChoreAssignedData {
  choreTitle: string
  dueDate: Date
  points: number
}

export interface ChoreCompletedData {
  childName: string
  choreTitle: string
  points: number
}

export interface PointsEarnedData {
  childName: string
  points: number
  totalPoints: number
}

/**
 * Send notification through all enabled channels (ntfy, email)
 */
export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
  const { userId, type, title, message, data } = payload

  try {
    // Get user with notification settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { notificationSettings: true },
    })

    if (!user) {
      logger.warn('User not found for notification', { userId })
      return
    }

    const settings = user.notificationSettings

    // Send via ntfy if configured
    if (settings?.ntfyTopic && settings.ntfyServerUrl) {
      await sendNtfyNotification({
        serverUrl: settings.ntfyServerUrl,
        topic: settings.ntfyTopic,
        title,
        message,
        priority: NotificationPriorities[type],
        tags: [...NotificationTags[type]],
        username: settings.ntfyUsername || undefined,
        password: settings.ntfyPassword || undefined,
      })
    }

    // Send via email if configured
    if (settings?.emailNotifications && settings.notificationEmail) {
      await sendEmailNotification(settings.notificationEmail, type, data)
    }

    // Also create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    })

    logger.info('Notification sent', { userId, type, channels: { ntfy: !!settings?.ntfyTopic, email: settings?.emailNotifications } })
  } catch (error) {
    logger.error('Failed to send notification', { error, userId, type })
  }
}

/**
 * Send email notification based on type
 */
const sendEmailNotification = async (
  email: string,
  type: NotificationType,
  data?: Record<string, any>
): Promise<void> => {
  try {
    switch (type) {
      case 'CHORE_ASSIGNED':
        if (data && 'choreTitle' in data && 'dueDate' in data && 'points' in data) {
          await sendChoreAssignedEmail(email, data.choreTitle, data.dueDate, data.points)
        }
        break
      case 'CHORE_COMPLETED':
        if (data && 'childName' in data && 'choreTitle' in data && 'points' in data) {
          await sendChoreCompletedEmail(email, data.childName, data.choreTitle, data.points)
        }
        break
      case 'POINTS_EARNED':
        if (data && 'childName' in data && 'points' in data && 'totalPoints' in data) {
          await sendPointsEarnedEmail(email, data.childName, data.points, data.totalPoints)
        }
        break
      default:
        logger.warn('Unknown notification type for email', { type })
    }
  } catch (error) {
    logger.error('Failed to send email notification', { error, email, type })
  }
}

/**
 * Send chore assigned notification
 */
export const notifyChoreAssigned = async (
  userId: number,
  choreTitle: string,
  dueDate: Date,
  points: number
): Promise<void> => {
  await sendNotification({
    userId,
    type: 'CHORE_ASSIGNED',
    title: 'New Chore Assigned',
    message: `You have been assigned "${choreTitle}" due on ${dueDate.toLocaleDateString()}. Points: ${points}`,
    data: { choreTitle, dueDate, points } as ChoreAssignedData,
  })
}

/**
 * Send chore due soon notification
 */
export const notifyChoreDueSoon = async (
  userId: number,
  choreTitle: string,
  dueDate: Date,
  hoursRemaining: number
): Promise<void> => {
  await sendNotification({
    userId,
    type: 'CHORE_DUE_SOON',
    title: 'Chore Due Soon',
    message: `"${choreTitle}" is due in ${hoursRemaining} hours (${dueDate.toLocaleDateString()})`,
  })
}

/**
 * Send chore completed notification (to parent)
 */
export const notifyChoreCompleted = async (
  parentUserId: number,
  childName: string,
  choreTitle: string,
  points: number
): Promise<void> => {
  await sendNotification({
    userId: parentUserId,
    type: 'CHORE_COMPLETED',
    title: 'Chore Completed!',
    message: `${childName} has completed "${choreTitle}" and earned ${points} points.`,
    data: { childName, choreTitle, points } as ChoreCompletedData,
  })
}

/**
 * Send chore overdue notification
 */
export const notifyChoreOverdue = async (
  userId: number,
  choreTitle: string,
  dueDate: Date
): Promise<void> => {
  await sendNotification({
    userId,
    type: 'CHORE_OVERDUE',
    title: 'Chore Overdue!',
    message: `"${choreTitle}" was due on ${dueDate.toLocaleDateString()} and is now overdue.`,
  })
}

/**
 * Send points earned notification
 */
export const notifyPointsEarned = async (
  userId: number,
  childName: string,
  points: number,
  totalPoints: number
): Promise<void> => {
  await sendNotification({
    userId,
    type: 'POINTS_EARNED',
    title: 'Points Earned!',
    message: `${childName} earned ${points} points! New total: ${totalPoints} points.`,
    data: { childName, points, totalPoints } as PointsEarnedData,
  })
}

export default {
  sendNotification,
  notifyChoreAssigned,
  notifyChoreDueSoon,
  notifyChoreCompleted,
  notifyChoreOverdue,
  notifyPointsEarned,
}
