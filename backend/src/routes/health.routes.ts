import { Router, Request, Response } from 'express'
import { prisma } from '../config/prisma'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Verify DB connectivity with a lightweight query
    const userCount = await prisma.user.count()
    res.json({
      success: true,
      data: {
        status: 'ok',
        db: { connected: true, users: userCount },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      error: null,
    })
  } catch (err) {
    res.status(503).json({
      success: false,
      data: { status: 'unhealthy', db: { connected: false } },
      error: { message: err instanceof Error ? err.message : 'Database unavailable' },
    })
  }
})

export default router
