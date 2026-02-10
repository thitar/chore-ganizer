import { Request, Response } from 'express'
import * as authService from '../services/auth.service.js'
import { AppError } from '../middleware/errorHandler.js'

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
