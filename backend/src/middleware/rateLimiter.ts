import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for authentication endpoints
 * 
 * NOTE: This rate limiter is DISABLED for login attempts.
 * 
 * Why? We already have per-user account lockout protection:
 * - After 5 failed login attempts, the account is locked for 15 minutes
 * - This is more secure than IP-based limiting (which can block legitimate users behind NAT)
 * - It correctly tracks per-user failed attempts in the database
 * 
 * This limiter still applies to registration (POST /api/auth/register)
 * to prevent spam account creation.
 * 
 * Disabled in test environment
 */
export const authLimiter = process.env.NODE_ENV === 'test'
  ? (_req: unknown, _res: unknown, next: () => void) => next() // No-op in test
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // High limit - practically disabled for login, still protects registration
      skip: (req) => {
        // Skip rate limiting for login attempts - rely on per-user account lockout instead
        if (req.path === '/api/auth/login' || req.url === '/api/auth/login') {
          return true
        }
        return false
      },
      message: {
        success: false,
        error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' }
      },
      standardHeaders: true,
      legacyHeaders: false,
    })
