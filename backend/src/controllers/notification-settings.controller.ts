import { Request, Response } from 'express'
import * as notificationSettingsService from '../services/notification-settings.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/notification-settings
 * Get notification settings for current user
 */
export const getSettings = async (req: Request, res: Response) => {
  const userId = req.user!.id

  const settings = await notificationSettingsService.getOrCreateSettings(userId)

  res.json({
    success: true,
    data: { settings },
  })
}

/**
 * PUT /api/notification-settings
 * Update notification settings for current user
 */
export const updateSettings = async (req: Request, res: Response) => {
  const userId = req.user!.id
  const {
    ntfyTopic,
    ntfyServerUrl,
    notifyChoreAssigned,
    notifyChoreDueSoon,
    notifyChoreCompleted,
    notifyChoreOverdue,
    notifyPointsEarned,
    reminderHoursBefore,
    quietHoursStart,
    quietHoursEnd,
  } = req.body

  // Validate quiet hours
  if (quietHoursStart !== undefined && (quietHoursStart < 0 || quietHoursStart > 23)) {
    throw new AppError('quietHoursStart must be between 0 and 23', 400, 'VALIDATION_ERROR')
  }
  if (quietHoursEnd !== undefined && (quietHoursEnd < 0 || quietHoursEnd > 23)) {
    throw new AppError('quietHoursEnd must be between 0 and 23', 400, 'VALIDATION_ERROR')
  }

  // Validate reminder hours
  if (reminderHoursBefore !== undefined && (reminderHoursBefore < 1 || reminderHoursBefore > 72)) {
    throw new AppError('reminderHoursBefore must be between 1 and 72', 400, 'VALIDATION_ERROR')
  }

  const settings = await notificationSettingsService.updateSettings(userId, {
    ntfyTopic,
    ntfyServerUrl,
    notifyChoreAssigned,
    notifyChoreDueSoon,
    notifyChoreCompleted,
    notifyChoreOverdue,
    notifyPointsEarned,
    reminderHoursBefore,
    quietHoursStart,
    quietHoursEnd,
  })

  res.json({
    success: true,
    data: { settings },
  })
}

/**
 * POST /api/notification-settings/test
 * Send test notification to verify ntfy configuration
 */
export const sendTestNotification = async (req: Request, res: Response) => {
  const userId = req.user!.id

  const success = await notificationSettingsService.sendTestNotification(userId)

  if (success) {
    res.json({
      success: true,
      message: 'Test notification sent successfully',
    })
  } else {
    throw new AppError(
      'Failed to send test notification. Please check your ntfy configuration.',
      400,
      'NOTIFICATION_ERROR'
    )
  }
}
