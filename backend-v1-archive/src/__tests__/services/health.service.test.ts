/**
 * Health Service Tests
 *
 * Unit tests for health check functions (checkDatabase, checkMemory, checkDisk, getUptime).
 * All dependencies (prisma, os, fs) are mocked to avoid real system access.
 */

import { checkDatabase, checkMemory, checkDisk, getUptime } from '../../services/health.service'
import prisma from '../../config/database'
import os from 'os'
import fs from 'fs'

// Mock prisma — only $queryRaw is used by health.service
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}))

// Mock OS module so checkMemory doesn't need real memory stats
jest.mock('os', () => ({
  totalmem: jest.fn(),
  freemem: jest.fn(),
}))

// Mock FS module so checkDisk doesn't touch real filesystem
jest.mock('fs', () => ({
  statSync: jest.fn(),
  accessSync: jest.fn(),
  constants: { W_OK: 1 },
}))

describe('Health Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Remove DATABASE_URL so checkDisk uses the fallback default path
    delete process.env.DATABASE_URL
  })

  // ==========================================
  // checkDatabase
  // ==========================================
  describe('checkDatabase', () => {
    it('should return connected when prisma query succeeds', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }])

      const result = await checkDatabase()

      expect(result.status).toBe('connected')
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    })

    it('should return error when prisma query fails', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'))

      const result = await checkDatabase()

      expect(result.status).toBe('error')
      expect(result.error).toBe('Connection refused')
    })

    it('should measure latency', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }])

      const result = await checkDatabase()

      expect(result.status).toBe('connected')
      expect(result.latency).toBeDefined()
      expect(typeof result.latency).toBe('number')
      expect(result.latency!).toBeGreaterThanOrEqual(0)
    })

    it('should handle non-Error exceptions gracefully', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue('String error')

      const result = await checkDatabase()

      expect(result.status).toBe('error')
      expect(result.error).toBe('Unknown database error')
    })
  })

  // ==========================================
  // checkMemory
  // ==========================================
  describe('checkMemory', () => {
    it('should return ok when usage below 80%', () => {
      ;(os.totalmem as jest.Mock).mockReturnValue(8 * 1024 * 1024 * 1024) // 8 GB
      ;(os.freemem as jest.Mock).mockReturnValue(4 * 1024 * 1024 * 1024) // 4 GB free → 50% used

      const result = checkMemory()

      expect(result.status).toBe('ok')
      expect(result.percentage).toBe(50)
      expect(result.used).toBeGreaterThan(0)
      expect(result.total).toBeGreaterThan(0)
    })

    it('should return warning when usage between 80-90%', () => {
      ;(os.totalmem as jest.Mock).mockReturnValue(1000)
      ;(os.freemem as jest.Mock).mockReturnValue(150) // 85% used

      const result = checkMemory()

      expect(result.status).toBe('warning')
      expect(result.percentage).toBe(85)
    })

    it('should return critical when usage above 90%', () => {
      ;(os.totalmem as jest.Mock).mockReturnValue(1000)
      ;(os.freemem as jest.Mock).mockReturnValue(50) // 95% used

      const result = checkMemory()

      expect(result.status).toBe('critical')
      expect(result.percentage).toBe(95)
    })

    it('should handle exactly 80% usage as ok (threshold is inclusive >80)', () => {
      ;(os.totalmem as jest.Mock).mockReturnValue(100)
      ;(os.freemem as jest.Mock).mockReturnValue(20) // 80% used

      const result = checkMemory()

      expect(result.status).toBe('ok')
    })

    it('should handle exactly 90% usage as warning (threshold is inclusive >90)', () => {
      ;(os.totalmem as jest.Mock).mockReturnValue(100)
      ;(os.freemem as jest.Mock).mockReturnValue(10) // 90% used

      const result = checkMemory()

      expect(result.status).toBe('warning')
    })

    it('should return valid MB conversions', () => {
      // 1 GB total, 500 MB free → ~500 MB used
      ;(os.totalmem as jest.Mock).mockReturnValue(1073741824) // 1 GB
      ;(os.freemem as jest.Mock).mockReturnValue(536870912) // 512 MB

      const result = checkMemory()

      expect(typeof result.used).toBe('number')
      expect(typeof result.total).toBe('number')
      expect(result.total).toBe(1024) // 1 GB = 1024 MB
      expect(result.used).toBe(512) // 512 MB
    })
  })

  // ==========================================
  // checkDisk
  // ==========================================
  describe('checkDisk', () => {
    it('should return ok when disk usage is low', () => {
      ;(fs.statSync as jest.Mock).mockReturnValue({ size: 5 * 1024 * 1024 }) // 5 MB DB file
      ;(fs.accessSync as jest.Mock).mockReturnValue(undefined)

      const result = checkDisk()

      expect(result.status).toBe('ok')
      expect(result.used).toBe(5) // 5 MB
      expect(result.path).toBeDefined()
      expect(typeof result.path).toBe('string')
    })

    it('should return critical when directory is not writable', () => {
      ;(fs.statSync as jest.Mock).mockReturnValue({ size: 1024 * 1024 })
      ;(fs.accessSync as jest.Mock).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const result = checkDisk()

      expect(result.status).toBe('critical')
      expect(result.used).toBe(0)
      expect(result.total).toBe(0)
      expect(result.percentage).toBe(0)
    })

    it('should handle missing db file gracefully', () => {
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        // Simulate ENOENT (db file not created yet)
        const err = new Error('ENOENT: no such file or directory')
        ;(err as NodeJS.ErrnoException).code = 'ENOENT'
        throw err
      })
      ;(fs.accessSync as jest.Mock).mockReturnValue(undefined)

      const result = checkDisk()

      // Directory is writable, DB just doesn't exist yet — treat as ok
      expect(result.status).toBe('ok')
      expect(result.used).toBe(0)
    })

    it('should handle missing db file with non-writable directory as critical', () => {
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory')
        ;(err as NodeJS.ErrnoException).code = 'ENOENT'
        throw err
      })
      ;(fs.accessSync as jest.Mock).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const result = checkDisk()

      expect(result.status).toBe('critical')
    })
  })

  // ==========================================
  // getUptime
  // ==========================================
  describe('getUptime', () => {
    it('should return a non-negative number', () => {
      const uptime = getUptime()

      expect(typeof uptime).toBe('number')
      expect(uptime).toBeGreaterThanOrEqual(0)
    })

    it('should return an integer (rounded seconds)', () => {
      const uptime = getUptime()

      expect(Number.isInteger(uptime)).toBe(true)
    })
  })
})
