import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'
import * as authService from '../services/auth.service.js'
import * as auditService from '../services/audit.service.js'
import * as usersService from '../services/users.service.js'
import { unlockAccount, isLocked } from '../utils/lockout.js'
import { AUDIT_ACTIONS } from '../constants/audit-actions.js'

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400, 'VALIDATION_ERROR')
  }

  // Only allow CHILD registration via public endpoint
  const effectiveRole = 'CHILD'

  const result = await authService.register({ 
    email, 
    password, 
    name, 
    role: effectiveRole 
  })

  // Set session
  req.session.userId = result.user.id

  res.status(201).json({
    success: true,
    data: result,
  })
}

/**
 * POST /api/auth/login
 * Login user with email and password
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR')
  }

  try {
    const result = await authService.login({ email, password })

    // Set session
    req.session.userId = result.user.id

    // Log successful login
    auditService.logLogin(req, result.user.id, true)

    // Debug logging
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Login session set', { userId: result.user.id, sessionId: req.sessionID })
      logger.debug('Login session details', { proto: req.headers['x-forwarded-proto'], secureCookies: process.env.SECURE_COOKIES })
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    // Log failed login attempt
    if (error instanceof AppError && error.statusCode === 401) {
      try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          auditService.logLogin(req, user.id, false)
        }
      } catch {
        // Ignore errors when looking up user for audit
      }
    }
    throw error
  }
}

/**
 * POST /api/auth/logout
 * Logout user and destroy session
 */
export const logout = async (req: Request, res: Response) => {
  const userId = req.user?.id

  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(new AppError('Failed to logout', 500, 'INTERNAL_ERROR'))
      } else {
        resolve()
      }
    })
  })

  // Log successful logout
  if (userId) {
    auditService.logLogout(req, userId)
  }

  res.clearCookie('connect.sid')
  res.json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  })
}

/**
 * GET /api/auth/me
 * Get current authenticated user (fetched fresh from database)
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED')
  }

  // Fetch fresh user data from database to ensure we have latest changes
  const user = await usersService.getUserById(req.user.id)

  res.json({
    success: true,
    data: {
      user,
    },
  })
}

/**
 * POST /api/auth/unlock/:userId
 * Unlock a user account (parent/admin only)
 */
export const unlock = async (req: Request, res: Response) => {
  const { userId } = req.params

  if (!userId) {
    throw new AppError('User ID is required', 400, 'VALIDATION_ERROR')
  }

  const parsedUserId = parseInt(Array.isArray(userId) ? userId[0] : userId, 10)
  if (isNaN(parsedUserId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  // Get current user to check if they're a parent
  if (!req.user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED')
  }

  // Only parents can unlock accounts
  if (req.user.role !== 'PARENT') {
    throw new AppError('Only parents can unlock accounts', 403, 'FORBIDDEN')
  }

  // Check lockout status before unlocking
  const lockoutStatus = await isLocked(parsedUserId)

  if (!lockoutStatus.isLocked) {
    res.json({
      success: true,
      data: {
        message: 'Account is not locked',
        userId: parsedUserId,
      },
    })
    return
  }

  // Unlock the account
  await unlockAccount(parsedUserId)

  // Log account unlock
  const context = auditService.getAuditContext(req)
  await auditService.createAuditLog({
    userId: req.user.id,
    action: AUDIT_ACTIONS.ACCOUNT_UNLOCKED_BY_ADMIN,
    entityType: 'User',
    entityId: parsedUserId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })

  res.json({
    success: true,
    data: {
      message: 'Account unlocked successfully',
      userId: parsedUserId,
    },
  })
}

/**
 * GET /api/auth/lockout-status/:userId
 * Get lockout status for a user (parent only)
 */
export const getLockoutStatus = async (req: Request, res: Response) => {
  const { userId } = req.params

  if (!userId) {
    throw new AppError('User ID is required', 400, 'VALIDATION_ERROR')
  }

  const parsedUserId = parseInt(Array.isArray(userId) ? userId[0] : userId, 10)
  if (isNaN(parsedUserId)) {
    throw new AppError('Invalid user ID', 400, 'VALIDATION_ERROR')
  }

  // Get current user to check if they're a parent
  if (!req.user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED')
  }

  // Only parents can view lockout status
  if (req.user.role !== 'PARENT') {
    throw new AppError('Only parents can view lockout status', 403, 'FORBIDDEN')
  }

  const lockoutStatus = await isLocked(parsedUserId)

  res.json({
    success: true,
    data: lockoutStatus,
  })
}
