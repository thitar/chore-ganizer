import { Request, Response } from 'express'
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
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    
    if (user.role !== 'PARENT') {
      res.status(403).json({ error: 'Only parents can access penalty settings' })
      return
    }
    
    const settings = await overduePenaltyService.getFamilyPenaltySettings()
    
    if (!settings) {
      res.status(404).json({ error: 'No family settings found' })
      return
    }
    
    res.json(settings)
  } catch (error) {
    console.error('[OverduePenaltyController] Error getting penalty settings:', error)
    res.status(500).json({ error: 'Failed to get penalty settings' })
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
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    
    if (user.role !== 'PARENT') {
      res.status(403).json({ error: 'Only parents can update penalty settings' })
      return
    }
    
    const { overduePenaltyEnabled, overduePenaltyMultiplier, notifyParentOnOverdue } = req.body
    
    // Validate multiplier
    if (overduePenaltyMultiplier !== undefined) {
      const multiplier = parseInt(overduePenaltyMultiplier, 10)
      if (isNaN(multiplier) || multiplier < 0 || multiplier > 10) {
        res.status(400).json({ error: 'Penalty multiplier must be a number between 0 and 10' })
        return
      }
    }
    
    // Update the user's notification settings (which contain penalty settings)
    const settings = await notificationSettingsService.updateSettings(user.id, {
      overduePenaltyEnabled,
      overduePenaltyMultiplier: overduePenaltyMultiplier ? parseInt(overduePenaltyMultiplier, 10) : undefined,
      notifyParentOnOverdue,
    })
    
    res.json({
      overduePenaltyEnabled: settings.overduePenaltyEnabled,
      overduePenaltyMultiplier: settings.overduePenaltyMultiplier,
      notifyParentOnOverdue: settings.notifyParentOnOverdue,
    })
  } catch (error) {
    console.error('[OverduePenaltyController] Error updating penalty settings:', error)
    res.status(500).json({ error: 'Failed to update penalty settings' })
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
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    
    if (user.role !== 'PARENT') {
      res.status(403).json({ error: 'Only parents can process overdue chores' })
      return
    }
    
    const result = await overduePenaltyService.processOverdueChores()
    
    res.json({
      message: `Processed ${result.processed} overdue chores`,
      ...result,
    })
  } catch (error) {
    console.error('[OverduePenaltyController] Error processing overdue chores:', error)
    res.status(500).json({ error: 'Failed to process overdue chores' })
  }
}

/**
 * Get list of overdue chores (for display)
 */
export const getOverdueChores = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
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
          assignedToId: user.id,
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
    
    res.json(choresWithDaysOverdue)
  } catch (error) {
    console.error('[OverduePenaltyController] Error getting overdue chores:', error)
    res.status(500).json({ error: 'Failed to get overdue chores' })
  }
}

/**
 * Get penalty history for a user or family
 */
export const getPenaltyHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user
    
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
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
          assignedToId: user.id,
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
    
    res.json(penalties)
  } catch (error) {
    console.error('[OverduePenaltyController] Error getting penalty history:', error)
    res.status(500).json({ error: 'Failed to get penalty history' })
  }
}