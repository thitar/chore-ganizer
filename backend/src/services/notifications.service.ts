import prisma from '../config/database.js'

export interface NotificationData {
  userId: number
  type: string
  title: string
  message: string
}

export interface Notification {
  id: number
  userId: number
  type: string
  title: string
  message: string
  read: boolean
  createdAt: Date
}

/**
 * Create a new notification
 */
export const createNotification = async (data: NotificationData): Promise<Notification> => {
  const notification = await prisma.notification.create({
    data,
  })

  return notification
}

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (
  userId: number,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  const where: any = {
    userId,
  }

  if (unreadOnly) {
    where.read = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return notifications
}

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  notificationId: number,
  userId: number
): Promise<Notification> => {
  // Verify notification exists and belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    throw new Error('Notification not found')
  }

  if (notification.userId !== userId) {
    throw new Error('Notification does not belong to user')
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })

  return updated
}

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId: number): Promise<number> => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  })

  return result.count
}

/**
 * Delete notification
 */
export const deleteNotification = async (
  notificationId: number,
  userId: number
): Promise<void> => {
  // Verify notification exists and belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    throw new Error('Notification not found')
  }

  if (notification.userId !== userId) {
    throw new Error('Notification does not belong to user')
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  })
}
