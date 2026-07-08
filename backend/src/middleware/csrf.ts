import { randomBytes } from 'crypto'
import { Request, Response, NextFunction } from 'express'

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'x-xsrf-token'
const TOKEN_LENGTH = 32

function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex')
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF in test environment
  if (process.env.NODE_ENV === 'test') {
    next()
    return
  }

  // Ensure a CSRF cookie exists on every response
  let token = req.cookies?.[CSRF_COOKIE]
  if (!token) {
    token = generateToken()
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
      path: '/',
    })
  }

  // Skip validation for safe methods
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next()
    return
  }

  // Validate header matches cookie on mutating requests
  const headerToken = req.headers[CSRF_HEADER] as string | undefined
  if (!headerToken || headerToken !== token) {
    res.status(403).json({
      success: false,
      error: { message: 'Invalid CSRF token' },
      data: null,
    })
    return
  }

  next()
}
