import { Request, Response } from 'express'
import * as authService from '../services/auth.service.js'
import { unlockAccount, isLocked } from '../utils/lockout.js'
import { AppError } from '../middleware/errorHandler.js'
import * as auditService from '../services/audit.service.js'
import { AUDIT_ACTIONS } from '../constants/audit-actions.js'
import prisma from '../config/database.js'

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400, 'VALIDATION_ERROR')
  }

  const result = await authService.register({ 
    email, 
    password, 
    name, 
    role: role || 'CHILD' 
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
      console.log('[Login] Session set for user:', result.user.id)
      console.log('[Login] Session ID:', req.sessionID)
      console.log('[Login] X-Forwarded-Proto:', req.headers['x-forwarded-proto'])
      console.log('[Login] Secure cookies enabled:', process.env.SECURE_COOKIES)
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

  req.session.destroy((err) => {
    if (err) {
      throw new AppError('Failed to logout', 500, 'INTERNAL_ERROR')
    }

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
  })
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED')
  }

  res.json({
    success: true,
    data: {
      user: req.user,
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

  const parsedUserId = parseInt(userId, 10)
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

  const parsedUserId = parseInt(userId, 10)
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
