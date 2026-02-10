import { Request, Response } from 'express'
import * as choresService from '../services/chores.service.js'
import * as notificationsService from '../services/notifications.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/chores
 * Get all chores (parents only)
 */
export const getAllChores = async (req: Request, res: Response) => {
  const { status, assignedToId } = req.query

  const chores = await choresService.getAllChores({
    status: status as 'pending' | 'completed' | 'all',
    assignedToId: assignedToId ? Number(assignedToId) : undefined,
  })

  res.json({
    success: true,
    data: { chores },
  })
}

/**
 * GET /api/chores/:id
 * Get chore by ID
 */
export const getChoreById = async (req: Request, res: Response) => {
  const choreId = Number(req.params.id)

  if (isNaN(choreId)) {
    throw new AppError('Invalid chore ID', 400, 'VALIDATION_ERROR')
  }

  const chore = await choresService.getChoreById(choreId)

  // Check if user has access (parent or assigned user)
  if (req.user!.role !== 'PARENT' && chore.assignedToId !== req.user!.id) {
    throw new AppError('Forbidden - You can only view your assigned chores', 403, 'FORBIDDEN')
  }

  res.json({
    success: true,
    data: { chore },
  })
}

/**
 * POST /api/chores
 * Create a new chore (parents only)
 */
export const createChore = async (req: Request, res: Response) => {
  const { title, description, points, assignedToId } = req.body

  if (!title || !points || !assignedToId) {
    throw new AppError('Title, points, and assignedToId are required', 400, 'VALIDATION_ERROR')
  }

  const chore = await choresService.createChore({
    title,
    description,
    points,
    assignedToId,
  })

  // Create notification for assigned user
  await notificationsService.createNotification({
    userId: assignedToId,
    type: 'CHORE_ASSIGNED',
    title: 'New chore assigned',
    message: `You have been assigned: ${title}`,
  })

  res.status(201).json({
    success: true,
    data: { chore },
  })
}

/**
 * PUT /api/chores/:id
 * Update a chore (parents only)
 */
export const updateChore = async (req: Request, res: Response) => {
  const choreId = Number(req.params.id)

  if (isNaN(choreId)) {
    throw new AppError('Invalid chore ID', 400, 'VALIDATION_ERROR')
  }

  const { title, description, points, assignedToId } = req.body

  const chore = await choresService.updateChore(choreId, {
    title,
    description,
    points,
    assignedToId,
  })

  res.json({
    success: true,
    data: { chore },
  })
}

/**
 * DELETE /api/chores/:id
 * Delete a chore (parents only)
 */
export const deleteChore = async (req: Request, res: Response) => {
  const choreId = Number(req.params.id)

  if (isNaN(choreId)) {
    throw new AppError('Invalid chore ID', 400, 'VALIDATION_ERROR')
  }

  await choresService.deleteChore(choreId)

  res.json({
    success: true,
    data: {
      message: 'Chore deleted successfully',
    },
  })
}

/**
 * POST /api/chores/:id/complete
 * Mark a chore as completed
 */
export const completeChore = async (req: Request, res: Response) => {
  const choreId = Number(req.params.id)

  if (isNaN(choreId)) {
    throw new AppError('Invalid chore ID', 400, 'VALIDATION_ERROR')
  }

  const result = await choresService.completeChore(choreId, req.user!.id)

  // Create notification for points earned
  await notificationsService.createNotification({
    userId: req.user!.id,
    type: 'POINTS_EARNED',
    title: 'Points earned!',
    message: `You earned ${result.pointsAwarded} points for completing: ${result.chore.title}`,
  })

  res.json({
    success: true,
    data: result,
  })
}
