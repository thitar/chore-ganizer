/**
 * Admin Service Tests
 *
 * Unit tests for the admin dashboard orchestration service.
 * All sub-service dependencies (health, audit, rateLimiter) and Prisma are mocked.
 */

import {
  getHealth,
  getActivity,
  getChoreStats,
  getPointSummary,
  getDashboard,
} from '../../services/admin.service'
import * as healthService from '../../services/health.service'
import * as auditService from '../../services/audit.service'
import * as rateLimiter from '../../middleware/rateLimiter'
import prisma from '../../config/database'

// Mock all sub-dependencies
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
    },
    choreAssignment: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    pointTransaction: {
      groupBy: jest.fn(),
    },
  },
}))

jest.mock('../../services/health.service', () => ({
  checkDatabase: jest.fn(),
  checkMemory: jest.fn(),
  checkDisk: jest.fn(),
  getUptime: jest.fn(),
}))

jest.mock('../../services/audit.service', () => ({
  getAuditLogs: jest.fn(),
}))

jest.mock('../../middleware/rateLimiter', () => ({
  getUserRequestCounts: jest.fn(),
}))

const FIXED_FAMILY_ID = 'family-test-123'

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================
  // getHealth
  // ==========================================
  describe('getHealth', () => {
    it('should return ok when all checks pass', async () => {
      ;(healthService.checkDatabase as jest.Mock).mockResolvedValue({
        status: 'connected',
        latency: 5,
      })
      ;(healthService.checkMemory as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 512,
        total: 1024,
        percentage: 50,
      })
      ;(healthService.checkDisk as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 100,
        total: 10000,
        percentage: 1,
        path: '/data',
      })
      ;(healthService.getUptime as jest.Mock).mockReturnValue(3600)

      const result = await getHealth()

      expect(result.status).toBe('ok')
      expect(result.database).toBe('connected')
      expect(result.uptime).toBe(3600)
    })

    it('should return degraded when memory is degraded', async () => {
      ;(healthService.checkDatabase as jest.Mock).mockResolvedValue({
        status: 'connected',
        latency: 5,
      })
      ;(healthService.checkMemory as jest.Mock).mockReturnValue({
        status: 'warning',
        used: 900,
        total: 1024,
        percentage: 88,
      })
      ;(healthService.checkDisk as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 100,
        total: 10000,
        percentage: 1,
        path: '/data',
      })
      ;(healthService.getUptime as jest.Mock).mockReturnValue(3600)

      const result = await getHealth()

      expect(result.status).toBe('degraded')
      expect(result.database).toBe('connected')
    })

    it('should return degraded when disk is degraded', async () => {
      ;(healthService.checkDatabase as jest.Mock).mockResolvedValue({
        status: 'connected',
        latency: 5,
      })
      ;(healthService.checkMemory as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 512,
        total: 1024,
        percentage: 50,
      })
      ;(healthService.checkDisk as jest.Mock).mockReturnValue({
        status: 'critical',
        used: 0,
        total: 0,
        percentage: 0,
        path: '/data',
      })
      ;(healthService.getUptime as jest.Mock).mockReturnValue(3600)

      const result = await getHealth()

      expect(result.status).toBe('degraded')
      expect(result.database).toBe('connected')
    })

    it('should return error when database is down', async () => {
      ;(healthService.checkDatabase as jest.Mock).mockResolvedValue({
        status: 'error',
        error: 'Connection refused',
      })
      ;(healthService.checkMemory as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 512,
        total: 1024,
        percentage: 50,
      })
      ;(healthService.checkDisk as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 100,
        total: 10000,
        percentage: 1,
        path: '/data',
      })
      ;(healthService.getUptime as jest.Mock).mockReturnValue(3600)

      const result = await getHealth()

      expect(result.status).toBe('error')
      expect(result.database).toBe('error')
    })
  })

  // ==========================================
  // getActivity
  // ==========================================
  describe('getActivity', () => {
    const mockLogs = [
      {
        id: 1,
        action: 'CHORE_COMPLETED',
        entityType: 'ChoreAssignment',
        userId: 2,
        timestamp: new Date('2026-01-15T10:00:00Z'),
        newValue: 'Completed wash dishes',
        oldValue: null,
        entityId: 42,
        ipAddress: null,
        userAgent: null,
      },
      {
        id: 2,
        action: 'POINTS_EARNED',
        entityType: 'PointTransaction',
        userId: 2,
        timestamp: new Date('2026-01-15T10:05:00Z'),
        newValue: 'Earned 10 points',
        oldValue: null,
        entityId: 43,
        ipAddress: null,
        userAgent: null,
      },
    ]

    it('should return formatted activity entries', async () => {
      ;(auditService.getAuditLogs as jest.Mock).mockResolvedValue({
        logs: mockLogs,
        total: 2,
      })

      const result = await getActivity(FIXED_FAMILY_ID, 20)

      expect(result.entries).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.entries[0]).toEqual({
        id: 1,
        action: 'CHORE_COMPLETED',
        entityType: 'ChoreAssignment',
        userId: 2,
        timestamp: mockLogs[0].timestamp,
        details: 'Completed wash dishes',
      })
      expect(result.entries[1]).toEqual({
        id: 2,
        action: 'POINTS_EARNED',
        entityType: 'PointTransaction',
        userId: 2,
        timestamp: mockLogs[1].timestamp,
        details: 'Earned 10 points',
      })
    })

    it('should call getAuditLogs with chore-relevant actions', async () => {
      ;(auditService.getAuditLogs as jest.Mock).mockResolvedValue({
        logs: [],
        total: 0,
      })

      await getActivity(FIXED_FAMILY_ID, 10)

      expect(auditService.getAuditLogs).toHaveBeenCalledWith({
        actions: expect.arrayContaining([
          'CHORE_ASSIGNED',
          'CHORE_COMPLETED',
          'CHORE_UPDATED',
          'CHORE_DELETED',
          'POINTS_EARNED',
          'POINTS_DEDUCTED',
          'POINTS_PAID_OUT',
          'RECURRING_CHORE_CREATED',
          'RECURRING_CHORE_OCCURRENCE_GENERATED',
        ]),
        limit: 10,
        page: 1,
      })
    })

    it('should return empty entries when no audit logs exist', async () => {
      ;(auditService.getAuditLogs as jest.Mock).mockResolvedValue({
        logs: [],
        total: 0,
      })

      const result = await getActivity(FIXED_FAMILY_ID)

      expect(result.entries).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  // ==========================================
  // getChoreStats
  // ==========================================
  describe('getChoreStats', () => {
    const mockMembers = [
      { id: 1, name: 'Parent' },
      { id: 2, name: 'Alice' },
      { id: 3, name: 'Bob' },
    ]

    it('should return aggregated statistics for family members', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockMembers)
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockResolvedValue([
        { userId: 2, status: 'COMPLETED', _count: 5 },
        { userId: 2, status: 'PENDING', _count: 2 },
        { userId: 3, status: 'COMPLETED', _count: 3 },
        { userId: 3, status: 'PENDING', _count: 4 },
      ])
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(2)

      const result = await getChoreStats(FIXED_FAMILY_ID)

      expect(result.totalAssigned).toBe(14)
      expect(result.completed).toBe(8)
      expect(result.pending).toBe(6)
      expect(result.overdue).toBe(2)
      expect(result.completionRate).toBeCloseTo(57.14, 1)
      expect(result.memberBreakdown).toHaveLength(3)

      // Parent (id: 1) has no chores assigned
      expect(result.memberBreakdown[0]).toEqual({
        userId: 1,
        name: 'Parent',
        totalAssigned: 0,
        completed: 0,
        completionRate: 0,
      })

      // Alice
      expect(result.memberBreakdown[1]).toEqual({
        userId: 2,
        name: 'Alice',
        totalAssigned: 7,
        completed: 5,
        completionRate: (5 / 7) * 100,
      })

      // Bob
      expect(result.memberBreakdown[2]).toEqual({
        userId: 3,
        name: 'Bob',
        totalAssigned: 7,
        completed: 3,
        completionRate: (3 / 7) * 100,
      })
    })

    it('should handle empty results', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockMembers)
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)

      const result = await getChoreStats(FIXED_FAMILY_ID)

      expect(result.totalAssigned).toBe(0)
      expect(result.completed).toBe(0)
      expect(result.pending).toBe(0)
      expect(result.overdue).toBe(0)
      expect(result.completionRate).toBe(0)
      expect(result.memberBreakdown).toHaveLength(3)
      result.memberBreakdown.forEach((m) => {
        expect(m.totalAssigned).toBe(0)
        expect(m.completed).toBe(0)
        expect(m.completionRate).toBe(0)
      })
    })

    it('should handle no family members', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)

      const result = await getChoreStats(FIXED_FAMILY_ID)

      expect(result.totalAssigned).toBe(0)
      expect(result.memberBreakdown).toHaveLength(0)
    })
  })

  // ==========================================
  // getPointSummary
  // ==========================================
  describe('getPointSummary', () => {
    const mockMembers = [
      { id: 1, name: 'Parent', points: 500 },
      { id: 2, name: 'Alice', points: 120 },
      { id: 3, name: 'Bob', points: 80 },
    ]

    it('should return point summary across members', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockMembers)
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockResolvedValue([
        { userId: 1, _sum: { amount: 200 } },
        { userId: 2, _sum: { amount: 50 } },
        { userId: 3, _sum: { amount: 30 } },
      ])

      const result = await getPointSummary(FIXED_FAMILY_ID)

      expect(result.memberBalances).toHaveLength(3)
      expect(result.memberBalances[0]).toEqual({ userId: 1, name: 'Parent', balance: 500 })
      expect(result.memberBalances[1]).toEqual({ userId: 2, name: 'Alice', balance: 120 })
      expect(result.memberBalances[2]).toEqual({ userId: 3, name: 'Bob', balance: 80 })
      expect(result.totalEarnedThisPeriod).toBe(280)
      expect(result.totalSpentThisPeriod).toBe(0)
    })

    it('should handle members with no transactions', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockMembers)
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockResolvedValue([])

      const result = await getPointSummary(FIXED_FAMILY_ID)

      expect(result.memberBalances).toHaveLength(3)
      expect(result.totalEarnedThisPeriod).toBe(0)
      expect(result.totalSpentThisPeriod).toBe(0)
    })

    it('should handle empty member list', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockResolvedValue([])

      const result = await getPointSummary(FIXED_FAMILY_ID)

      expect(result.memberBalances).toHaveLength(0)
      expect(result.totalEarnedThisPeriod).toBe(0)
      expect(result.totalSpentThisPeriod).toBe(0)
    })

    it('should handle negative transaction sums (spending)', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockMembers)
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockResolvedValue([
        { userId: 1, _sum: { amount: -50 } },
        { userId: 2, _sum: { amount: 100 } },
      ])

      const result = await getPointSummary(FIXED_FAMILY_ID)

      expect(result.totalEarnedThisPeriod).toBe(100)
      expect(result.totalSpentThisPeriod).toBe(50)
      expect(result.memberBalances[0]).toEqual({ userId: 1, name: 'Parent', balance: 500 })
      expect(result.memberBalances[1]).toEqual({ userId: 2, name: 'Alice', balance: 120 })
    })
  })

  // ==========================================
  // getDashboard
  // ==========================================
  describe('getDashboard', () => {
    beforeEach(() => {
      // Set up default successful responses for all sub-services
      ;(healthService.checkDatabase as jest.Mock).mockResolvedValue({
        status: 'connected',
        latency: 5,
      })
      ;(healthService.checkMemory as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 512,
        total: 1024,
        percentage: 50,
      })
      ;(healthService.checkDisk as jest.Mock).mockReturnValue({
        status: 'ok',
        used: 100,
        total: 10000,
        percentage: 1,
        path: '/data',
      })
      ;(healthService.getUptime as jest.Mock).mockReturnValue(3600)

      ;(auditService.getAuditLogs as jest.Mock).mockResolvedValue({
        logs: [],
        total: 0,
      })

      ;(rateLimiter.getUserRequestCounts as jest.Mock).mockReturnValue([
        { userId: 1, count: 5, windowStart: '2026-01-15T09:00:00Z' },
      ])

      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 1, name: 'Parent', points: 500 },
        { id: 2, name: 'Alice', points: 120 },
      ])
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockResolvedValue([])
    })

    it('should return complete dashboard data', async () => {
      const result = await getDashboard(FIXED_FAMILY_ID)

      expect(result).toHaveProperty('health')
      expect(result).toHaveProperty('choreStats')
      expect(result).toHaveProperty('pointSummary')
      expect(result).toHaveProperty('activity')
      expect(result).toHaveProperty('rateLimits')

      expect(result.health).not.toBeNull()
      expect(result.choreStats).not.toBeNull()
      expect(result.pointSummary).not.toBeNull()
      expect(result.activity).not.toBeNull()
      expect(result.rateLimits).not.toBeNull()

      expect(result.health!.status).toBe('ok')
      expect(result.choreStats!.totalAssigned).toBe(0)
      expect(result.pointSummary!.memberBalances).toHaveLength(2)
      expect(result.activity!.entries).toHaveLength(0)
      expect(result.rateLimits!.perUser).toHaveLength(1)
    })

    it('should handle partial failure — one section returns null', async () => {
      // Make choreStats fail
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockRejectedValue(
        new Error('Query timeout')
      )

      const result = await getDashboard(FIXED_FAMILY_ID)

      expect(result.health).not.toBeNull()
      expect(result.choreStats).toBeNull()
      expect(result.pointSummary).not.toBeNull()
      expect(result.activity).not.toBeNull()
      expect(result.rateLimits).not.toBeNull()
    })

    it('should handle multiple sections failing', async () => {
      // Make choreStats and pointSummary fail
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockRejectedValue(
        new Error('Query timeout')
      )
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockRejectedValue(
        new Error('Connection error')
      )
      ;(auditService.getAuditLogs as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      )

      const result = await getDashboard(FIXED_FAMILY_ID)

      expect(result.health).not.toBeNull()
      expect(result.choreStats).toBeNull()
      expect(result.pointSummary).toBeNull()
      expect(result.activity).toBeNull()
      expect(result.rateLimits).not.toBeNull()
    })

    it('should handle all sections failing gracefully', async () => {
      // Make ALL sub-services throw
      ;(healthService.checkDatabase as jest.Mock).mockRejectedValue(
        new Error('DB down')
      )
      ;(auditService.getAuditLogs as jest.Mock).mockRejectedValue(
        new Error('Audit down')
      )
      ;(rateLimiter.getUserRequestCounts as jest.Mock).mockImplementation(() => {
        throw new Error('Rate limiter error')
      })
      ;(prisma.choreAssignment.groupBy as jest.Mock).mockRejectedValue(
        new Error('Chore query failed')
      )
      ;(prisma.pointTransaction.groupBy as jest.Mock).mockRejectedValue(
        new Error('Points query failed')
      )

      const result = await getDashboard(FIXED_FAMILY_ID)

      expect(result.health).toBeNull()
      expect(result.choreStats).toBeNull()
      expect(result.pointSummary).toBeNull()
      expect(result.activity).toBeNull()
      expect(result.rateLimits).toBeNull()
    })

    it('should call all sub-services with correct familyId', async () => {
      await getDashboard('family-custom-456')

      expect(healthService.checkDatabase).toHaveBeenCalled()
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: 'family-custom-456' } })
      )
      expect(auditService.getAuditLogs).toHaveBeenCalled()
      expect(rateLimiter.getUserRequestCounts).toHaveBeenCalled()
    })
  })
})
