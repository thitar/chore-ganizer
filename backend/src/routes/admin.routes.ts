import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { getRequestCount, getGeneralLimiterConfig, getAuthLimiterConfig } from '../middleware/rateLimiter.js'

const router = Router()

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
