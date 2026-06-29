import { Request, Response } from 'express'
import * as notificationsService from '../services/notifications.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
export const getNotifications = async (req: Request, res: Response) => {
  const { unread } = req.query

  const notifications = await notificationsService.getUserNotifications(
    req.user!.id,
    unread === 'true'
  )

  res.json({
    success: true,
    data: { notifications },
  })
}

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  const notificationId = Number(req.params.id)

  if (isNaN(notificationId)) {
    throw new AppError('Invalid notification ID', 400, 'VALIDATION_ERROR')
  }

  const notification = await notificationsService.markNotificationAsRead(
    notificationId,
    req.user!.id
  )

  res.json({
    success: true,
    data: { notification },
  })
}

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  const count = await notificationsService.markAllAsRead(req.user!.id)

  res.json({
    success: true,
    data: {
      message: 'All notifications marked as read',
      count,
    },
  })
}

/**
 * POST /api/notifications/check-overdue
 * Create notifications for overdue chores (can be called periodically or manually)
 */
export const checkOverdue = async (_req: Request, res: Response) => {
  const count = await notificationsService.createOverdueNotifications()

  res.json({
    success: true,
    data: {
      message: `Created ${count} overdue notifications`,
      count,
    },
  })
}
