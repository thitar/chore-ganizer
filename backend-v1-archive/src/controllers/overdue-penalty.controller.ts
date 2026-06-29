import { Request, Response } from 'express'
import { logger } from '../utils/logger.js'
import * as overduePenaltyService from '../services/overdue-penalty.service.js'
import * as notificationSettingsService from '../services/notification-settings.service.js'
import prisma from '../config/database.js'

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    email: string
    name: string
    role: 'PARENT' | 'CHILD'
    points: number
    color: string | null
  }
}

/**
 * Get overdue penalty settings for the family
 * Only accessible by parents
 */
export const getPenaltySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } })
      return
    }
    
    if (user.role !== 'PARENT') {
      res.status(403).json({ success: false, error: { message: 'Only parents can access penalty settings', code: 'FORBIDDEN' } })
      return
    }
    
    const settings = await overduePenaltyService.getFamilyPenaltySettings()
    
    if (!settings) {
      res.status(404).json({ success: false, error: { message: 'No family settings found', code: 'NOT_FOUND' } })
      return
    }
    
    res.json({ success: true, data: settings })
  } catch (error) {
    logger.error('Failed to get penalty settings', { component: 'OverduePenaltyController', action: 'getPenaltySettings', error: String(error) })
    res.status(500).json({ success: false, error: { message: 'Failed to get penalty settings', code: 'INTERNAL_ERROR' } })
  }
}

/**
 * Update overdue penalty settings
 * Only accessible by parents
 */
export const updatePenaltySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } })
      return
    }
    
    if (user.role !== 'PARENT') {
      res.status(403).json({ success: false, error: { message: 'Only parents can update penalty settings', code: 'FORBIDDEN' } })
      return
    }
    
    const { overduePenaltyEnabled, overduePenaltyMultiplier, notifyParentOnOverdue } = req.body
    
    // Validate multiplier
    if (overduePenaltyMultiplier !== undefined) {
      const multiplier = parseInt(overduePenaltyMultiplier, 10)
      if (isNaN(multiplier) || multiplier < 0 || multiplier > 10) {
        res.status(400).json({ success: false, error: { message: 'Penalty multiplier must be a number between 0 and 10', code: 'VALIDATION_ERROR' } })
        return
      }
    }
    
    // Update the user's notification settings (which contain penalty settings)
    const settings = await notificationSettingsService.updateSettings(user.id, {
      overduePenaltyEnabled,
      overduePenaltyMultiplier: overduePenaltyMultiplier !== undefined ? parseInt(overduePenaltyMultiplier, 10) : undefined,
      notifyParentOnOverdue,
    })
    
    res.json({
      success: true,
      data: {
        overduePenaltyEnabled: settings.overduePenaltyEnabled,
        overduePenaltyMultiplier: settings.overduePenaltyMultiplier,
        notifyParentOnOverdue: settings.notifyParentOnOverdue,
      },
    })
  } catch (error) {
    logger.error('Failed to update penalty settings', { component: 'OverduePenaltyController', action: 'updatePenaltySettings', error: String(error) })
    res.status(500).json({ success: false, error: { message: 'Failed to update penalty settings', code: 'INTERNAL_ERROR' } })
  }
}

/**
 * Manually trigger overdue chore processing
 * Only accessible by parents
 */
export const processOverdue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } })
      return
    }
    
    if (user.role !== 'PARENT') {
      res.status(403).json({ success: false, error: { message: 'Only parents can process overdue chores', code: 'FORBIDDEN' } })
      return
    }
    
    const result = await overduePenaltyService.processOverdueChores()
    
    res.json({
      success: true,
      data: {
        message: `Processed ${result.processed} overdue chores`,
        ...result,
      },
    })
  } catch (error) {
    logger.error('Failed to process overdue chores', { component: 'OverduePenaltyController', action: 'processOverdue', error: String(error) })
    res.status(500).json({ success: false, error: { message: 'Failed to process overdue chores', code: 'INTERNAL_ERROR' } })
  }
}

/**
 * Get list of overdue chores (for display)
 */
export const getOverdueChores = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } })
      return
    }
    
    const now = new Date()
    
    // Parents can see all overdue chores, children only see their own
    const whereClause = user.role === 'PARENT'
      ? {
          dueDate: { lt: now },
          status: 'PENDING',
        }
      : {
          dueDate: { lt: now },
          status: 'PENDING',
          userId: user.id,
        }
    
    const overdueChores = await prisma.choreAssignment.findMany({
      where: whereClause,
      include: {
        choreTemplate: true,
        assignedTo: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })
    
    // Add days overdue to each chore
    const choresWithDaysOverdue = overdueChores.map(chore => ({
      ...chore,
      daysOverdue: overduePenaltyService.calculateDaysOverdue(chore.dueDate),
    }))
    
    res.json({ success: true, data: choresWithDaysOverdue })
  } catch (error) {
    logger.error('Failed to get overdue chores', { component: 'OverduePenaltyController', action: 'getOverdueChores', error: String(error) })
    res.status(500).json({ success: false, error: { message: 'Failed to get overdue chores', code: 'INTERNAL_ERROR' } })
  }
}

/**
 * Get penalty history for a user or family
 */
export const getPenaltyHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } })
      return
    }
    
    // Parents can see all penalties, children only see their own
    const whereClause = user.role === 'PARENT'
      ? {
          penaltyApplied: true,
          penaltyPoints: { not: null },
        }
      : {
          penaltyApplied: true,
          penaltyPoints: { not: null },
          userId: user.id,
        }
    
    const penalties = await prisma.choreAssignment.findMany({
      where: whereClause,
      include: {
        choreTemplate: true,
        assignedTo: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { dueDate: 'desc' },
      take: 50,
    })
    
    res.json({ success: true, data: penalties })
  } catch (error) {
    logger.error('Failed to get penalty history', { component: 'OverduePenaltyController', action: 'getPenaltyHistory', error: String(error) })
    res.status(500).json({ success: false, error: { message: 'Failed to get penalty history', code: 'INTERNAL_ERROR' } })
  }
}
