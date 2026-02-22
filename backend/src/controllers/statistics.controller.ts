import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { getFamilyStatistics, getChildStatistics } from '../services/statistics.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/statistics/family
 * Get family statistics with optional date range
 */
export const getFamilyStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query
  const userId = req.user!.id

  // Fetch user with familyId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true },
  })

  if (!user?.familyId) {
    throw new AppError('User does not belong to a family', 400, 'VALIDATION_ERROR')
  }

  const dateRange =
    startDate && endDate
      ? {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        }
      : undefined

  const stats = await getFamilyStatistics(user.familyId, dateRange)

  res.json({
    success: true,
    data: stats,
  })
}

/**
 * GET /api/statistics/child/:childId
 * Get statistics for a specific child
 */
export const getChildStats = async (req: Request, res: Response) => {
  const { childId } = req.params
  const { startDate, endDate } = req.query
  const userId = req.user!.id

  // Verify the requesting user has access to this child's statistics
  const requestingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true, role: true },
  })

  const child = await prisma.user.findUnique({
    where: { id: parseInt(childId) },
    select: { familyId: true, role: true },
  })

  // Check if child exists
  if (!child) {
    throw new AppError('Child not found', 404, 'NOT_FOUND')
  }

  // Authorization check: user must be in the same family as the child
  if (!requestingUser?.familyId || requestingUser.familyId !== child.familyId) {
    throw new AppError('Access denied: child not in your family', 403, 'FORBIDDEN')
  }

  const dateRange =
    startDate && endDate
      ? {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        }
      : undefined

  const stats = await getChildStatistics(parseInt(childId), dateRange)

  res.json({
    success: true,
    data: stats,
  })
}
