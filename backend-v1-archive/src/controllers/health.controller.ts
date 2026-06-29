import { Request, Response } from 'express'
import { VERSION } from '../version'
import prisma from '../config/database.js'
import { getCacheStats } from '../utils/cache.js'
import { checkDatabase, checkMemory, checkDisk, getUptime, HealthCheckResult } from '../services/health.service.js'

/**
 * GET /api/health
 * Enhanced health check endpoint with database, memory, and disk checks
 */
export const healthCheck = async (_req: Request, res: Response) => {
  const checks = {
    database: await checkDatabase(),
    memory: checkMemory(),
    disk: checkDisk(),
  }

  // Determine overall status
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok'
  
  if (checks.database.status === 'error') {
    overallStatus = 'error'
  } else if (
    checks.memory.status === 'critical' ||
    checks.disk.status === 'critical'
  ) {
    overallStatus = 'error'
  } else if (
    checks.memory.status === 'warning' ||
    checks.disk.status === 'warning'
  ) {
    overallStatus = 'degraded'
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: getUptime(), // seconds
    checks,
  }

  // Return appropriate HTTP status based on health
  const httpStatus = overallStatus === 'error' ? 503 : 200
  
  res.status(httpStatus).json(result)
}

/**
 * GET /api/health/live
 * Liveness probe - just check if the server is running
 */
export const livenessCheck = (_req: Request, res: Response) => {
  res.json({ status: 'alive' })
}

/**
 * GET /api/health/ready
 * Readiness probe - check if the server is ready to accept requests
 */
export const readinessCheck = async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ready' })
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: 'Database not available' 
    })
  }
}

/**
 * GET /api/health/cache
 * Get cache statistics
 */
export const getCacheStatsHandler = (_req: Request, res: Response) => {
  const stats = getCacheStats()
  res.json({
    success: true,
    data: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
    },
  })
}

// Security.txt content following RFC 9116
const SECURITY_TXT = `Contact: security@chore-ganizer.example.com
Expires: 2027-12-31T23:59:00.000Z
Preferred-Languages: en
Canonical: https://chore-ganizer.example.com/.well-known/security.txt
Policy: https://chore-ganizer.example.com/docs/SECURITY.md

# Chore-Ganizer Security
# Please report security vulnerabilities responsibly
`

/**
 * GET /.well-known/security.txt
 * Returns security.txt file following RFC 9116 standard
 */
export const getSecurityTxt = (_req: Request, res: Response) => {
  res.type('text/plain').send(SECURITY_TXT)
}
