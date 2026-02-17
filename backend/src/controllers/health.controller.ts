import { Request, Response } from 'express'
import { VERSION } from '../version.js'

/**
 * GET /health
 * Health check endpoint
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: VERSION,
  })
}
