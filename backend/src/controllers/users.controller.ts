import { Request, Response } from 'express'
import * as usersService from '../services/users.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/users
 * Get all users (parents only)
 */
export const getAllUsers = async (_req: Request, res: Response) => {
  const users = await usersService.getAllUsers()

  res.json({
    success: true,
    data: { users },
  })
}

/**
 * GET /api/users/:id
 * Get user by ID (parents only)
 */
export const getUserById = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  const user = await usersService.getUserById(userId)

  res.json({
    success: true,
    data: { user },
  })
}

/**
 * GET /api/users/:id/assignments
 * Get assignments assigned to a user
 */
export const getUserAssignments = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)
  const { status } = req.query

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  // Check if user has access (parent or own user)
  if (req.user!.role !== 'PARENT' && userId !== req.user!.id) {
    throw new AppError('Forbidden - You can only view your own assignments', 403, 'FORBIDDEN')
  }

  const assignments = await usersService.getUserAssignments(
    userId,
    status as 'pending' | 'completed' | 'overdue' | 'all'
  )

  res.json({
    success: true,
    data: { assignments },
  })
}

/**
 * PUT /api/users/:id
 * Update user (parents only)
 */
export const updateUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)
  const { name, role } = req.body

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  const user = await usersService.updateUser(userId, { name, role })

  res.json({
    success: true,
    data: { user },
  })
}
