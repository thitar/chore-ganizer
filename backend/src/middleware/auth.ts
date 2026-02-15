import { Request, Response, NextFunction } from 'express'
import prisma from '../config/database.js'

/**
 * Authentication middleware - verifies user session
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Debug logging
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('[Auth] Session ID:', req.sessionID)
      console.log('[Auth] Session data:', req.session)
      console.log('[Auth] Cookies:', req.headers.cookie)
      console.log('[Auth] Origin:', req.headers.origin)
      console.log('[Auth] Host:', req.headers.host)
    }

    const userId = req.session.userId

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized - No session found',
          code: 'UNAUTHORIZED',
        },
      })
      return
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        points: true,
      },
    })

    if (!user) {
      // Clear invalid session
      req.session.destroy(() => {})
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized - User not found',
          code: 'UNAUTHORIZED',
        },
      })
      return
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'PARENT' | 'CHILD',
      points: user.points,
    }
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Role-based access control middleware
 * @param allowedRoles - Array of roles that can access the route
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized - No user found',
          code: 'UNAUTHORIZED',
        },
      })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden - Insufficient permissions',
          code: 'FORBIDDEN',
        },
      })
      return
    }

    next()
  }
}

/**
 * Require parent role middleware
 */
export const requireParent = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized - No user found',
        code: 'UNAUTHORIZED',
      },
    })
    return
  }

  if (req.user.role !== 'PARENT') {
    res.status(403).json({
      success: false,
      error: {
        message: 'Forbidden - Parent access required',
        code: 'FORBIDDEN',
      },
    })
    return
  }

  next()
}
