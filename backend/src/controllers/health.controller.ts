import { Request, Response } from 'express'

/**
 * GET /health
 * Health check endpoint
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
}
