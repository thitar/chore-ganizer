/**
 * Tests for Admin Controller
 *
 * Tests cover:
 * - getDashboardHandler: User familyId lookup, success response, error handling
 * - getRateLimitsPerUser: Return rate limit data
 * - getUserNotificationSettings: Credential stripping, param validation
 * - Cross-family isolation: FamilyId scoping enforcement
 */

import { Request, Response } from 'express'
import { getDashboardHandler, getRateLimitsPerUser, getUserNotificationSettings } from '../../controllers/admin.controller'

// Mock dependencies — jest.mock is hoisted above imports

jest.mock('../../services/admin.service', () => ({
  getDashboard: jest.fn(),
  getRateLimits: jest.fn(),
}))

jest.mock('../../services/notification-settings.service', () => ({
  getOrCreateSettings: jest.fn(),
}))

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

// These imports resolve to mocked versions because jest.mock is hoisted
import prisma from '../../config/database'
import { getDashboard, getRateLimits } from '../../services/admin.service'
import { getOrCreateSettings } from '../../services/notification-settings.service'
import { createMockRequest, createMockResponse } from '../test-helpers'

describe('Admin Controller', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  const mockDashboardData = {
    health: { status: 'ok' as const, database: 'connected' as const, uptime: 12345 },
    choreStats: {
      totalAssigned: 10,
      completed: 7,
      pending: 3,
      overdue: 1,
      completionRate: 70,
      memberBreakdown: [
        { userId: 1, name: 'Parent', totalAssigned: 5, completed: 4, completionRate: 80 },
      ],
    },
    pointSummary: {
      memberBalances: [{ userId: 1, name: 'Parent', balance: 100 }],
      totalEarnedThisPeriod: 50,
      totalSpentThisPeriod: 10,
    },
    activity: {
      entries: [
        {
          id: 1,
          action: 'CHORE_COMPLETED',
          entityType: 'ChoreAssignment',
          userId: 1,
          timestamp: new Date(),
          details: null,
        },
      ],
      total: 1,
    },
    rateLimits: {
      perUser: [{ userId: 1, count: 5, windowStart: new Date().toISOString() }],
    },
  }

  const mockRateLimits = {
    perUser: [
      { userId: 1, count: 10, windowStart: '2024-01-01T00:00:00Z' },
      { userId: 2, count: 3, windowStart: '2024-01-01T00:00:00Z' },
    ],
  }

  const mockNotificationSettingsFull = {
    id: 1,
    userId: 1,
    ntfyTopic: 'chores',
    ntfyServerUrl: 'https://ntfy.sh',
    ntfyUsername: 'testuser',
    ntfyPassword: 'supersecret',
    emailNotifications: true,
    notificationEmail: 'user@example.com',
    notifyChoreAssigned: true,
    notifyChoreDueSoon: true,
    notifyChoreCompleted: true,
    notifyChoreOverdue: false,
    notifyPointsEarned: true,
    reminderHoursBefore: 2,
    quietHoursStart: null,
    quietHoursEnd: null,
    overduePenaltyEnabled: true,
    overduePenaltyMultiplier: 2,
    notifyParentOnOverdue: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeEach(() => {
    mockReq = createMockRequest({
      user: {
        id: 1,
        email: 'parent@test.com',
        name: 'Test Parent',
        role: 'PARENT',
        points: 100,
        color: '#3B82F6',
      },
    })
    mockRes = createMockResponse()
    jest.clearAllMocks()
  })

  describe('getDashboardHandler', () => {
    it('should return 400 if user has no familyId', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        getDashboardHandler(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('User does not belong to a family')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { familyId: true },
      })
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should return dashboard data on success', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-123' })
      ;(getDashboard as jest.Mock).mockResolvedValue(mockDashboardData)

      await getDashboardHandler(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockDashboardData })
    })

    it('should call getDashboard with correct familyId', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-123' })
      ;(getDashboard as jest.Mock).mockResolvedValue(mockDashboardData)

      await getDashboardHandler(mockReq as Request, mockRes as Response)

      expect(getDashboard).toHaveBeenCalledWith('family-123')
    })
  })

  describe('getRateLimitsPerUser', () => {
    it('should return per-user rate limit data', async () => {
      ;(getRateLimits as jest.Mock).mockResolvedValue(mockRateLimits)

      await getRateLimitsPerUser(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockRateLimits })
    })
  })

  describe('getUserNotificationSettings', () => {
    it('should return notification settings with credentials stripped', async () => {
      mockReq.params = { userId: '1' }
      ;(getOrCreateSettings as jest.Mock).mockResolvedValue(mockNotificationSettingsFull)

      await getUserNotificationSettings(mockReq as Request, mockRes as Response)

      // Verify the shape of the response
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            settings: expect.objectContaining({
              notifyChoreAssigned: true,
              reminderHoursBefore: 2,
            }),
          },
        })
      )

      // Verify credential fields were stripped — inspect call args directly
      const jsonMock = mockRes.json as jest.Mock
      const responseData = jsonMock.mock.calls[0][0]
      const settings = responseData.data.settings

      expect(settings.ntfyPassword).toBeUndefined()
      expect(settings.ntfyUsername).toBeUndefined()
      expect(settings.emailNotifications).toBeUndefined()
      expect(settings.notificationEmail).toBeUndefined()
    })

    it('should return 400 for invalid userId parameter', async () => {
      mockReq.params = { userId: 'abc' }

      await expect(
        getUserNotificationSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Invalid userId parameter')

      expect(getOrCreateSettings).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should call getOrCreateSettings with correct userId', async () => {
      mockReq.params = { userId: '42' }
      ;(getOrCreateSettings as jest.Mock).mockResolvedValue(mockNotificationSettingsFull)

      await getUserNotificationSettings(mockReq as Request, mockRes as Response)

      expect(getOrCreateSettings).toHaveBeenCalledWith(42)
    })
  })

  describe('Cross-family isolation', () => {
    it('should not leak data across families — familyId from req determines scope', async () => {
      // First user from family-123
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-123' })
      ;(getDashboard as jest.Mock).mockResolvedValue(mockDashboardData)

      await getDashboardHandler(mockReq as Request, mockRes as Response)

      expect(getDashboard).toHaveBeenCalledWith('family-123')

      // Second user — different family
      jest.clearAllMocks()

      const secondReq = createMockRequest({
        user: {
          id: 2,
          email: 'other@test.com',
          name: 'Other Parent',
          role: 'PARENT',
          points: 200,
          color: '#EF4444',
        },
      })
      const secondRes = createMockResponse()

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ familyId: 'family-456' })
      ;(getDashboard as jest.Mock).mockResolvedValue(mockDashboardData)

      await getDashboardHandler(secondReq as Request, secondRes as Response)

      expect(getDashboard).toHaveBeenCalledWith('family-456')
    })
  })
})
