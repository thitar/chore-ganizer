import prisma from '../config/database.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Track server start time for uptime calculation
const serverStartTime = Date.now()

export interface DatabaseCheckResult {
  status: 'connected' | 'error'
  latency?: number
  error?: string
}

export interface MemoryCheckResult {
  status: 'ok' | 'warning' | 'critical'
  used: number
  total: number
  percentage: number
}

export interface DiskCheckResult {
  status: 'ok' | 'warning' | 'critical'
  used: number
  total: number
  percentage: number
  path: string
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: DatabaseCheckResult
    memory: MemoryCheckResult
    disk: DiskCheckResult
  }
}

/**
 * Get server uptime in seconds
 */
export function getUptime(): number {
  return Math.round((Date.now() - serverStartTime) / 1000)
}

/**
 * Check database connectivity
 */
export async function checkDatabase(): Promise<DatabaseCheckResult> {
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
export function checkMemory(): MemoryCheckResult {
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
export function checkDisk(): DiskCheckResult {
  // Get the database path
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/opt/app-data/chore-ganizer/chore-ganizer.db'
  const dataDir = path.dirname(dbPath)
  
  try {
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
      path: dataDir,
    }
  }
}
