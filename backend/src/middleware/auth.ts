import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
      data: null,
    })
    return
  }

  const userExists = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true },
  })

  if (!userExists) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid')
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
        data: null,
      })
    })
    return
  }

  next()
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.role || !roles.includes(req.session.role)) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden' },
        data: null,
      })
      return
    }
    next()
  }
}
