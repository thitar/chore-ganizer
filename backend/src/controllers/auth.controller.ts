import { Request, Response } from 'express'
import * as authService from '../services/auth.service.js'
import { AppError } from '../middleware/errorHandler.js'

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

  const result = await authService.login({ email, password })

  // Set session
  req.session.userId = result.user.id

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
}

/**
 * POST /api/auth/logout
 * Logout user and destroy session
 */
export const logout = async (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      throw new AppError('Failed to logout', 500, 'INTERNAL_ERROR')
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
