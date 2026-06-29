import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'
import { validate, registerSchema, loginSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Create a new user account (parent or child). Rate limited to 5 requests per 15 minutes.
 *     operationId: register
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input or user already exists
 *       429:
 *         description: Too many registration attempts
 */
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register))

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticate with email and password. Creates a session cookie. Rate limited to 5 requests per 15 minutes.
 *     operationId: login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful, session cookie set
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials or account locked
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login))

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     description: Destroy the current session
 *     operationId: logout
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, asyncHandler(authController.logout))

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     description: Retrieve the profile of the authenticated user
 *     operationId: getCurrentUser
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser))

/**
 * @swagger
 * /auth/unlock/{userId}:
 *   post:
 *     tags: [Auth]
 *     summary: Unlock a user account
 *     description: Reset failed login attempts and unlock a user account (Parent-only)
 *     operationId: unlock
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account unlocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only endpoint)
 */
router.post('/unlock/:userId', authenticate, asyncHandler(authController.unlock))

/**
 * @swagger
 * /auth/lockout-status/{userId}:
 *   get:
 *     tags: [Auth]
 *     summary: Get lockout status for a user
 *     description: Check if a user account is locked due to failed login attempts (Parent-only)
 *     operationId: getLockoutStatus
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lockout status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLocked:
 *                       type: boolean
 *                     attemptsRemaining:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only endpoint)
 */
router.get('/lockout-status/:userId', authenticate, asyncHandler(authController.getLockoutStatus))

export default router
