/**
 * Tests for Statistics Service
 *
 * Tests cover:
 * - getFamilyStatistics: Fetch family-wide statistics
 * - getChildStatistics: Fetch individual child statistics
 */

import * as statisticsService from '../../services/statistics.service'
import prisma from '../../config/database'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    choreAssignment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    pointTransaction: {
      findMany: jest.fn(),
    },
  },
}))

describe('Statistics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getFamilyStatistics', () => {
    const mockFamilyMembers = [
      { id: 1, name: 'Test Parent', role: 'PARENT' },
      { id: 2, name: 'Test Child', role: 'CHILD' },
    ]

    it('should return family statistics with default date range', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockFamilyMembers)
      ;(prisma.choreAssignment.count as jest.Mock)
        .mockResolvedValueOnce(10) // totalAssigned
        .mockResolvedValueOnce(7) // completed
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(1) // overdue
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([
        { amount: 10, createdAt: new Date('2024-01-15'), userId: 2 },
        { amount: 5, createdAt: new Date('2024-01-15'), userId: 2 },
      ])
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          assignedTo: { name: 'Test Child' },
          choreTemplate: { title: 'Dishes', points: 10 },
          completedAt: new Date('2024-01-15'),
        },
      ])

      const result = await statisticsService.getFamilyStatistics('family-123')

      expect(result.familyMembers).toHaveLength(2)
      expect(result.familyMembers[0].name).toBe('Test Parent')
      expect(result.choreStats.totalAssigned).toBe(10)
      expect(result.choreStats.completed).toBe(7)
      expect(result.choreStats.pending).toBe(3)
      expect(result.choreStats.overdue).toBe(1)
      expect(result.choreStats.completionRate).toBe(70)
      expect(result.dateRange.startDate).toBeInstanceOf(Date)
      expect(result.dateRange.endDate).toBeInstanceOf(Date)
    })

    it('should return family statistics with custom date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockFamilyMembers)
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(5)
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      const result = await statisticsService.getFamilyStatistics('family-123', {
        startDate,
        endDate,
      })

      expect(result.dateRange.startDate).toEqual(startDate)
      expect(result.dateRange.endDate).toEqual(endDate)
    })

    it('should handle zero assignments correctly', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockFamilyMembers)
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      const result = await statisticsService.getFamilyStatistics('family-123')

      expect(result.choreStats.totalAssigned).toBe(0)
      expect(result.choreStats.completionRate).toBe(0)
    })

    it('should group point trends by date', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockFamilyMembers)
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([
        { amount: 10, createdAt: new Date('2024-01-15T10:00:00Z'), userId: 2 },
        { amount: 5, createdAt: new Date('2024-01-15T14:00:00Z'), userId: 2 },
        { amount: 15, createdAt: new Date('2024-01-16T10:00:00Z'), userId: 2 },
      ])
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      const result = await statisticsService.getFamilyStatistics('family-123')

      expect(result.pointTrends).toHaveLength(2)
      expect(result.pointTrends[0].totalPoints).toBe(15) // 10 + 5 on Jan 15
      expect(result.pointTrends[0].count).toBe(2)
      expect(result.pointTrends[1].totalPoints).toBe(15) // 15 on Jan 16
      expect(result.pointTrends[1].count).toBe(1)
    })
  })

  describe('getChildStatistics', () => {
    it('should return child statistics', async () => {
      ;(prisma.choreAssignment.count as jest.Mock)
        .mockResolvedValueOnce(8) // totalAssigned
        .mockResolvedValueOnce(6) // completed
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([
        { id: 1, type: 'EARNED', amount: 10, description: 'Chore completed', createdAt: new Date() },
        { id: 2, type: 'BONUS', amount: 5, description: 'Good job!', createdAt: new Date() },
        { id: 3, type: 'DEDUCTION', amount: -3, description: 'Penalty', createdAt: new Date() },
      ])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        points: 50,
      })

      const result = await statisticsService.getChildStatistics(2)

      expect(result.totalAssigned).toBe(8)
      expect(result.completed).toBe(6)
      expect(result.completionRate).toBe(75)
      expect(result.currentPoints).toBe(50)
      expect(result.pointsEarned).toBe(15) // 10 + 5
      expect(result.pointsSpent).toBe(3) // |-3|
      expect(result.pointHistory).toHaveLength(3)
    })

    it('should handle child with no assignments', async () => {
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        points: 0,
      })

      const result = await statisticsService.getChildStatistics(2)

      expect(result.totalAssigned).toBe(0)
      expect(result.completed).toBe(0)
      expect(result.completionRate).toBe(0)
      expect(result.currentPoints).toBe(0)
      expect(result.pointsEarned).toBe(0)
      expect(result.pointsSpent).toBe(0)
    })

    it('should handle non-existent user', async () => {
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await statisticsService.getChildStatistics(999)

      expect(result.currentPoints).toBe(0)
    })

    it('should use custom date range for child statistics', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(5)
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ points: 25 })

      const result = await statisticsService.getChildStatistics(2, {
        startDate,
        endDate,
      })

      expect(result).toBeDefined()
      // Verify that prisma methods were called with date filters
      expect(prisma.choreAssignment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        })
      )
    })
  })
})
