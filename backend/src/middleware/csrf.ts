import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

// Extend session type to include CSRF token
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string
  }
}

/**
 * Generate a random CSRF token
 */
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * CSRF middleware that generates and validates tokens
 * 
 * - GET requests: Generate and attach token to response locals
 * - POST/PUT/DELETE/PATCH requests: Validate token from header or body
 */
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken()
  }

  // For safe methods (GET, HEAD, OPTIONS), just attach token and continue
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    res.locals.csrfToken = req.session.csrfToken
    next()
    return
  }

  // For state-changing methods, validate the token
  const providedToken = req.headers['x-csrf-token'] as string || req.body?._csrf

  if (!providedToken) {
    res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token is required',
        code: 'CSRF_TOKEN_MISSING',
      },
    })
    return
  }

  // Use timing-safe comparison to prevent timing attacks
  const expectedToken = req.session.csrfToken
  if (!expectedToken || !crypto.timingSafeEqual(
    Buffer.from(providedToken, 'hex'),
    Buffer.from(expectedToken, 'hex')
  )) {
    res.status(403).json({
      success: false,
      error: {
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      },
    })
    return
  }

  // Token is valid, attach to locals and continue
  res.locals.csrfToken = req.session.csrfToken
  next()
}

/**
 * Handler to get CSRF token
 * Returns the current CSRF token for the session
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  // Ensure token exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken()
  }

  res.json({
    success: true,
    data: {
      csrfToken: req.session.csrfToken,
    },
  })
}

/**
 * Regenerate CSRF token (useful after login)
 */
export const regenerateCsrfToken = (req: Request): string => {
  const newToken = generateToken()
  req.session.csrfToken = newToken
  return newToken
}
