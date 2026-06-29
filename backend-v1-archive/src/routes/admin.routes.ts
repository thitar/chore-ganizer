import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as adminController from '../controllers/admin.controller.js'
import { getRequestCount, getGeneralLimiterConfig, getAuthLimiterConfig } from '../middleware/rateLimiter.js'

const router = Router()

/**
 * @swagger
 * /admin/rate-limits/status:
 *   get:
 *     summary: Get current rate limit configuration and usage stats
 *     tags:
 *       - Admin
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Rate limit status
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
 *                     general:
 *                       type: object
 *                       properties:
 *                         windowMs:
 *                           type: integer
 *                         max:
 *                           type: integer
 *                         currentCount:
 *                           type: integer
 *                         windowStart:
 *                           type: string
 *                         disabled:
 *                           type: boolean
 *                     auth:
 *                       type: object
 *                       properties:
 *                         windowMs:
 *                           type: integer
 *                         max:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/rate-limits/status',
  authenticate,
  authorize('PARENT'),
  (_req, res) => {
    const generalConfig = getGeneralLimiterConfig()
    const authConfig = getAuthLimiterConfig()
    const requestStats = getRequestCount()
    const disabled = process.env.DISABLE_RATE_LIMIT === 'true'

    res.json({
      success: true,
      data: {
        general: {
          windowMs: generalConfig.windowMs,
          max: generalConfig.max,
          currentCount: requestStats.count,
          windowStart: requestStats.windowStart,
          disabled,
        },
        auth: {
          windowMs: authConfig.windowMs,
          max: authConfig.max,
        },
      },
    })
  }
)

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Admin]
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Full dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardData'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/dashboard',
  authenticate,
  authorize('PARENT'),
  asyncHandler(adminController.getDashboardHandler)
)

/**
 * @swagger
 * /admin/rate-limits/per-user:
 *   get:
 *     summary: Get per-user rate limit breakdown
 *     tags: [Admin]
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Per-user rate limit counts
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
 *                     perUser:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: integer
 *                           count:
 *                             type: integer
 *                           windowStart:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/rate-limits/per-user',
  authenticate,
  authorize('PARENT'),
  asyncHandler(adminController.getRateLimitsPerUser)
)

/**
 * @swagger
 * /admin/users/{userId}/notification-settings:
 *   get:
 *     summary: Get notification settings for a specific user
 *     tags: [Admin]
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User notification settings (credentials stripped)
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
 *                     settings:
 *                       $ref: '#/components/schemas/NotificationSettings'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/users/:userId/notification-settings',
  authenticate,
  authorize('PARENT'),
  asyncHandler(adminController.getUserNotificationSettings)
)

export default router
