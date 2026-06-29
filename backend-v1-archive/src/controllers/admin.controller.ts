import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { getDashboard, getRateLimits } from '../services/admin.service.js'
import { getOrCreateSettings } from '../services/notification-settings.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/admin/dashboard
 * Returns full admin dashboard data
 */
export const getDashboardHandler = async (req: Request, res: Response) => {
  const userId = req.user!.id

  // Fetch user to get familyId (not included in req.user by authenticate middleware)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true },
  })

  if (!user?.familyId) {
    throw new AppError('User does not belong to a family', 400, 'VALIDATION_ERROR')
  }

  const data = await getDashboard(user.familyId)

  res.json({ success: true, data })
}

/**
 * GET /api/admin/rate-limits/per-user
 * Returns per-user request count breakdown
 */
export const getRateLimitsPerUser = async (_req: Request, res: Response) => {
  const data = await getRateLimits()

  res.json({ success: true, data })
}

/**
 * GET /api/admin/users/:userId/notification-settings
 * Returns per-user notification settings with credential fields stripped
 */
export const getUserNotificationSettings = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10)

  if (isNaN(userId)) {
    throw new AppError('Invalid userId parameter', 400, 'VALIDATION_ERROR')
  }

  const settings = await getOrCreateSettings(userId)

  // Strip credential fields
  const { ntfyPassword, ntfyUsername, emailNotifications, notificationEmail, ...safeSettings } = settings

  res.json({ success: true, data: { settings: safeSettings } })
}
