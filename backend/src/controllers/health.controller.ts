import { Request, Response } from 'express'
import { VERSION } from '../version.js'
import prisma from '../config/database.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { getCacheStats } from '../utils/cache.js'

// Track server start time
const serverStartTime = Date.now()

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: {
      status: 'connected' | 'error'
      latency?: number
      error?: string
    }
    memory: {
      status: 'ok' | 'warning' | 'critical'
      used: number
      total: number
      percentage: number
    }
    disk: {
      status: 'ok' | 'warning' | 'critical'
      used: number
      total: number
      percentage: number
      path: string
    }
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ status: 'connected' | 'error'; latency?: number; error?: string }> {
  try {
    const start = Date.now()
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    return { status: 'connected', latency }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: 'ok' | 'warning' | 'critical'; used: number; total: number; percentage: number } {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const percentage = (usedMemory / totalMemory) * 100

  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (percentage > 90) {
    status = 'critical'
  } else if (percentage > 80) {
    status = 'warning'
  }

  return {
    status,
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round(percentage * 100) / 100,
  }
}

/**
 * Check disk usage for the data directory
 */
function checkDisk(): { status: 'ok' | 'warning' | 'critical'; used: number; total: number; percentage: number; path: string } {
  try {
    // Get the database path
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/data/chore-ganizer.db'
    
    // Get file stats for the database
    let dbSize = 0
    try {
      const stats = fs.statSync(dbPath)
      dbSize = stats.size
    } catch {
      // Database file might not exist yet
    }

    // For Docker containers, we'll use a simplified approach
    // Check if we can write to the data directory
    const dataDir = path.dirname(dbPath)
    let totalDisk = 10 * 1024 * 1024 * 1024 // Assume 10GB default
    let usedDisk = dbSize

    // Try to get actual disk usage via statvfs (Node.js doesn't have native support)
    // We'll estimate based on database size and assume reasonable limits
    try {
      // Check if directory exists and is writable
      fs.accessSync(dataDir, fs.constants.W_OK)
    } catch {
      return {
        status: 'critical',
        used: 0,
        total: 0,
        percentage: 0,
        path: dataDir,
      }
    }

    const percentage = totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0

    let status: 'ok' | 'warning' | 'critical' = 'ok'
    if (percentage > 90) {
      status = 'critical'
    } else if (percentage > 80) {
      status = 'warning'
    }

    return {
      status,
      used: Math.round(usedDisk / 1024 / 1024), // MB
      total: Math.round(totalDisk / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100,
      path: dataDir,
    }
  } catch (error) {
    return {
      status: 'error' as 'critical',
      used: 0,
      total: 0,
      percentage: 0,
      path: '/app/data',
    }
  }
}

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
    uptime: Math.round((Date.now() - serverStartTime) / 1000), // seconds
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
