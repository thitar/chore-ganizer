import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
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

export default router
