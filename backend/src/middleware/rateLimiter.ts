import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for authentication endpoints
 * Limits each IP to 5 login attempts per 15 minutes
 * Disabled in test environment
 */
export const authLimiter = process.env.NODE_ENV === 'test'
  ? (_req: unknown, _res: unknown, next: () => void) => next() // No-op in test
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per window
      message: {
        success: false,
        error: { message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' }
      },
      standardHeaders: true,
      legacyHeaders: false,
    })
