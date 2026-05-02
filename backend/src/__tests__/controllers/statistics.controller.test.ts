import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/statistics.service', () => ({
  getFamilyStatistics: jest.fn(),
  getChildStatistics: jest.fn(),
}))

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'
import * as statisticsService from '../../services/statistics.service'
import { getFamilyStats, getChildStats } from '../../controllers/statistics.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Statistics Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getFamilyStats', () => {
    it('should return 200 with family statistics on success', async () => {
      const mockStats = {
        totalChores: 10,
        completedChores: 7,
        totalPoints: 100,
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-123' })
      ;(statisticsService.getFamilyStatistics as jest.Mock).mockResolvedValue(mockStats)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        query: { startDate: '2024-01-01', endDate: '2024-12-31' },
      })

      await getFamilyStats(mockReq as Request, mockRes as Response)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { familyId: true },
      })
      expect(statisticsService.getFamilyStatistics).toHaveBeenCalledWith(
        'family-123',
        { startDate: expect.any(Date), endDate: expect.any(Date) }
      )
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      })
    })

    it('should call service without date range when query params are missing', async () => {
      const mockStats = { totalChores: 5, completedChores: 3, totalPoints: 50 }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-123' })
      ;(statisticsService.getFamilyStatistics as jest.Mock).mockResolvedValue(mockStats)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getFamilyStats(mockReq as Request, mockRes as Response)

      expect(statisticsService.getFamilyStatistics).toHaveBeenCalledWith(
        'family-123',
        undefined
      )
    })

    it('should throw 400 if user does not belong to a family', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: null })

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        getFamilyStats(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-123' })
      ;(statisticsService.getFamilyStatistics as jest.Mock).mockRejectedValue(
        new Error('Stats error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        getFamilyStats(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Stats error')
    })
  })

  describe('getChildStats', () => {
    it('should return 200 with child statistics for parent', async () => {
      const mockStats = { totalChores: 8, completedChores: 5, totalPoints: 40 }
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ familyId: 'family-123', role: 'PARENT' })
        .mockResolvedValueOnce({ familyId: 'family-123', role: 'CHILD' })
      ;(statisticsService.getChildStatistics as jest.Mock).mockResolvedValue(mockStats)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { childId: '2' },
        query: { startDate: '2024-01-01', endDate: '2024-12-31' },
      })

      await getChildStats(mockReq as Request, mockRes as Response)

      expect(statisticsService.getChildStatistics).toHaveBeenCalledWith(
        2,
        { startDate: expect.any(Date), endDate: expect.any(Date) }
      )
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      })
    })

    it('should throw 404 if child not found', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ familyId: 'family-123', role: 'PARENT' })
        .mockResolvedValueOnce(null)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { childId: '999' },
      })

      await expect(
        getChildStats(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 403 if child is in a different family', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ familyId: 'family-123', role: 'PARENT' })
        .mockResolvedValueOnce({ familyId: 'family-456', role: 'CHILD' })

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { childId: '2' },
      })

      await expect(
        getChildStats(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ familyId: 'family-123', role: 'PARENT' })
        .mockResolvedValueOnce({ familyId: 'family-123', role: 'CHILD' })
      ;(statisticsService.getChildStatistics as jest.Mock).mockRejectedValue(
        new Error('Stats error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { childId: '2' },
      })

      await expect(
        getChildStats(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Stats error')
    })
  })
})
