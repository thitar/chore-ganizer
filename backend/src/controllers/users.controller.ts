import { Request, Response } from 'express'
import * as bcrypt from 'bcrypt'
import * as usersService from '../services/users.service.js'
import { AppError } from '../middleware/errorHandler.js'
import * as auditService from '../services/audit.service.js'
import { AUDIT_ACTIONS } from '../constants/audit-actions.js'

/**
 * GET /api/users
 * Get all users
 */
export const getAllUsers = async (_req: Request, res: Response) => {
  const users = await usersService.getAllUsers()

  res.json({
    success: true,
    data: { users },
  })
}

/**
 * POST /api/users
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  const { email, password, name, role, color, basePocketMoney } = req.body

  // Check if email already exists
  const existingUser = await usersService.getUserByEmail(email)
  if (existingUser) {
    throw new AppError('Email is already taken', 400, 'VALIDATION_ERROR')
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await usersService.createUser({
    email,
    password: hashedPassword,
    name,
    role: role || 'CHILD',
    color: color || '#3B82F6',
    basePocketMoney: basePocketMoney || 0,
  })

  // Log user creation
  const context = auditService.getAuditContext(req)
  await auditService.createAuditLog({
    userId: req.user!.id,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    newValue: { email, name, role },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })

  res.status(201).json({
    success: true,
    data: { user },
  })
}

/**
 * GET /api/users/:id
 * Get user by ID
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
 * Update user
 */
export const updateUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)
  const { name, role, color, email, basePocketMoney } = req.body

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  // Prevent demoting the last parent
  if (role === 'CHILD') {
    const targetUser = await usersService.getUserById(userId)
    if (targetUser.role === 'PARENT') {
      const parentCount = await usersService.getParentCount()
      if (parentCount <= 1) {
        throw new AppError('Cannot demote the last parent account', 400, 'VALIDATION_ERROR')
      }
    }
  }

  const user = await usersService.updateUser(userId, { name, role, color, email, basePocketMoney })

  // Log user update
  const context = auditService.getAuditContext(req)
  await auditService.createAuditLog({
    userId: req.user!.id,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entityType: 'User',
    entityId: userId,
    newValue: { name, role, color, email, basePocketMoney },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })

  res.json({
    success: true,
    data: { user },
  })
}

/**
 * DELETE /api/users/:id
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  // Check if trying to delete self
  if (userId === req.user!.id) {
    throw new AppError('You cannot delete your own account', 400, 'VALIDATION_ERROR')
  }

  // Check if deleting the last parent
  const targetUser = await usersService.getUserById(userId)
  if (targetUser.role === 'PARENT') {
    const parentCount = await usersService.getParentCount()
    if (parentCount <= 1) {
      throw new AppError('Cannot delete the last parent account', 400, 'VALIDATION_ERROR')
    }
  }

  // Check if user has active assignments
  const hasActiveAssignments = await usersService.userHasActiveAssignments(userId)
  if (hasActiveAssignments) {
    throw new AppError('Cannot delete user with active assignments', 400, 'VALIDATION_ERROR')
  }

  await usersService.deleteUser(userId)

  // Log user deletion
  const context = auditService.getAuditContext(req)
  await auditService.createAuditLog({
    userId: req.user!.id,
    action: AUDIT_ACTIONS.USER_DELETED,
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })

  res.json({
    success: true,
    data: { message: 'User deleted successfully' },
  })
}

/**
 * POST /api/users/:id/lock
 * Lock a user account
 */
export const lockUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  // Cannot lock yourself
  if (userId === req.user!.id) {
    throw new AppError('You cannot lock your own account', 400, 'VALIDATION_ERROR')
  }

  const user = await usersService.lockUser(userId)

  // Log user lock
  const context = auditService.getAuditContext(req)
  await auditService.createAuditLog({
    userId: req.user!.id,
    action: AUDIT_ACTIONS.USER_LOCKED,
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })

  res.json({
    success: true,
    data: { user },
  })
}

/**
 * POST /api/users/:id/unlock
 * Unlock a user account
 */
export const unlockUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id)

  if (isNaN(userId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  const user = await usersService.unlockUser(userId)

  // Log user unlock
  const context = auditService.getAuditContext(req)
  await auditService.createAuditLog({
    userId: req.user!.id,
    action: AUDIT_ACTIONS.USER_UNLOCKED,
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })

  res.json({
    success: true,
    data: { user },
  })
}
