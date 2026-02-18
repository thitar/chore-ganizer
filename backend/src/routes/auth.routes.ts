import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'
import { validate, registerSchema, loginSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rate    5 requests per 15 minutes
 */
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register))

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @rate    5 requests per 15 minutes
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login))

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(authController.logout))

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser))

/**
 * @route   POST /api/auth/unlock/:userId
 * @desc    Unlock a user account
 * @access  Private (Parent only)
 */
router.post('/unlock/:userId', authenticate, asyncHandler(authController.unlock))

/**
 * @route   GET /api/auth/lockout-status/:userId
 * @desc    Get lockout status for a user
 * @access  Private (Parent only)
 */
router.get('/lockout-status/:userId', authenticate, asyncHandler(authController.getLockoutStatus))

export default router
