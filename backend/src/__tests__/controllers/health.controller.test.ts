import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}))

jest.mock('../../utils/cache', () => ({
  getCacheStats: jest.fn(),
}))

jest.mock('../../version', () => ({
  VERSION: '2.1.10',
}))

import prisma from '../../config/database'
import { getCacheStats } from '../../utils/cache'
import { healthCheck, livenessCheck, readinessCheck, getCacheStatsHandler, getSecurityTxt } from '../../controllers/health.controller'

describe('Health Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('healthCheck', () => {
    it('should return 200 with health check result on success', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }])

      await healthCheck(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      const jsonArg = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(jsonArg.status).toBeDefined()
      expect(jsonArg.timestamp).toBeDefined()
      expect(jsonArg.version).toBe('2.1.10')
      expect(jsonArg.uptime).toBeDefined()
      expect(jsonArg.checks).toBeDefined()
      expect(jsonArg.checks.database).toBeDefined()
      expect(jsonArg.checks.memory).toBeDefined()
      expect(jsonArg.checks.disk).toBeDefined()
    })

    it('should return 503 if database check fails', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB connection failed'))

      await healthCheck(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(503)
      const jsonArg = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(jsonArg.status).toBe('error')
      expect(jsonArg.checks.database.status).toBe('error')
    })
  })

  describe('livenessCheck', () => {
    it('should return alive status', () => {
      livenessCheck(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'alive' })
    })
  })

  describe('readinessCheck', () => {
    it('should return ready when DB is connected', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }])

      await readinessCheck(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ready' })
    })

    it('should return 503 when DB is not available', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Not connected'))

      await readinessCheck(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(503)
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'not ready',
        error: 'Database not available',
      })
    })
  })

  describe('getCacheStatsHandler', () => {
    it('should return cache statistics', () => {
      const mockStats = { keys: 10, hits: 50, misses: 5, ksize: 1024, vsize: 2048 }
      ;(getCacheStats as jest.Mock).mockReturnValue(mockStats)

      getCacheStatsHandler(mockReq as Request, mockRes as Response)

      expect(getCacheStats).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          keys: 10,
          hits: 50,
          misses: 5,
          ksize: 1024,
          vsize: 2048,
        },
      })
    })
  })

  describe('getSecurityTxt', () => {
    it('should return security.txt as plain text', () => {
      mockRes = {
        ...mockRes,
        type: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as any

      getSecurityTxt(mockReq as Request, mockRes as Response)

      expect(mockRes.type).toHaveBeenCalledWith('text/plain')
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.stringContaining('security@chore-ganizer.example.com')
      )
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.stringContaining('Canonical')
      )
    })
  })
})
