import rateLimit from 'express-rate-limit'

export function getGeneralLimiterConfig(): { windowMs: number; max: number } {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  }
}

export function getAuthLimiterConfig(): { windowMs: number; max: number } {
  return {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10),
  }
}

interface RequestCounter {
  count: number
  windowStart: number
}

let requestCounter: RequestCounter = { count: 0, windowStart: Date.now() }

export function incrementRequestCount(): void {
  const now = Date.now()
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
  if (now - requestCounter.windowStart > windowMs) {
    requestCounter = { count: 0, windowStart: now }
  }
  requestCounter.count++
}

export function resetRequestCount(): void {
  requestCounter = { count: 0, windowStart: Date.now() }
}

export function getRequestCount(): { count: number; windowStart: string } {
  return {
    count: requestCounter.count,
    windowStart: new Date(requestCounter.windowStart).toISOString(),
  }
}

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
      windowMs: getAuthLimiterConfig().windowMs,
      max: getAuthLimiterConfig().max,
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
