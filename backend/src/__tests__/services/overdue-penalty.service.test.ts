/**
 * Overdue Penalty Service Tests
 */

import * as overdueService from '../../services/overdue-penalty.service'
import * as notificationsService from '../../services/notifications.service'
import { mockNotificationSettings } from '../test-helpers'

// Mock notifications service
jest.mock('../../services/notifications.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 }),
}))

// Mock notification-settings service
jest.mock('../../services/notification-settings.service', () => ({
  getOrCreateSettings: jest.fn(),
  sendPushNotification: jest.fn().mockResolvedValue(true),
}))

// Mock Prisma
const mockTx = {
  user: {
    update: jest.fn(),
  },
  choreAssignment: {
    update: jest.fn(),
  },
}

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    choreAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'
import { getOrCreateSettings } from '../../services/notification-settings.service'

describe('Overdue Penalty Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Restore $transaction to execute callback (tests that override this must isolate)
    ;(prisma.$transaction as jest.Mock).mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx))
    ;(getOrCreateSettings as jest.Mock).mockResolvedValue({
      ...mockNotificationSettings.default,
      ntfyTopic: 'test-topic',
    })
  })

  describe('notifyParentOfOverdue', () => {
    it('should create an in-app notification for the parent', async () => {
      await overdueService.notifyParentOfOverdue(1, {
        childName: 'Alice',
        choreTitle: 'Wash Dishes',
        daysOverdue: 3,
        penaltyPoints: -20,
      })

      expect(notificationsService.createNotification).toHaveBeenCalledWith({
        userId: 1,
        type: 'CHORE_OVERDUE',
        title: 'Overdue: Wash Dishes',
        message: '"Wash Dishes" assigned to Alice is 3 day(s) overdue. Penalty of 20 points applied.',
      })
    })

    it('should create in-app notification even when notifyParentOnOverdue is false', async () => {
      ;(getOrCreateSettings as jest.Mock).mockResolvedValue({
        ...mockNotificationSettings.default,
        notifyParentOnOverdue: false,
      })

      await overdueService.notifyParentOfOverdue(1, {
        childName: 'Alice',
        choreTitle: 'Wash Dishes',
        daysOverdue: 3,
        penaltyPoints: -20,
      })

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, type: 'CHORE_OVERDUE' })
      )
    })
  })

  describe('notifyChildOfPenalty', () => {
    it('should create an in-app notification for the child', async () => {
      await overdueService.notifyChildOfPenalty(2, {
        choreTitle: 'Wash Dishes',
        penaltyPoints: -20,
      })

      expect(notificationsService.createNotification).toHaveBeenCalledWith({
        userId: 2,
        type: 'PENALTY',
        title: 'Penalty Applied',
        message: 'You received a penalty of 20 points for overdue chore: Wash Dishes',
      })
    })
  })

  describe('findOverdueChoresWithoutPenalty', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('should not return assignments with penaltyApplied=true (double-penalty prevention)', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))

      const mockOverdueChores = [
        {
          id: 1,
          templateId: 1,
          userId: 2,
          assignedById: 1,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING',
          penaltyApplied: false,
          penaltyPoints: null,
          createdAt: new Date('2024-01-14T10:00:00Z'),
          completedAt: null,
          notes: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockOverdueChores)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            penaltyApplied: false,
          }),
        })
      )
      expect(result).toEqual(mockOverdueChores)
    })

    it('should consider a chore due at 23:59 UTC as overdue at 00:01 next day', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T00:01:00Z'))

      const mockOverdueChores = [
        {
          id: 1,
          templateId: 1,
          userId: 2,
          assignedById: 1,
          dueDate: new Date('2024-01-15T23:59:00Z'),
          status: 'PENDING',
          penaltyApplied: false,
          penaltyPoints: null,
          createdAt: new Date('2024-01-14T10:00:00Z'),
          completedAt: null,
          notes: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockOverdueChores)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-01-16T00:00:00Z') },
          }),
        })
      )
      expect(result).toEqual(mockOverdueChores)
    })

    it('should NOT consider a chore due at 00:01 UTC as overdue at 23:59 same day', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T23:59:00Z'))

      const mockNotOverdueChores: any[] = []

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockNotOverdueChores)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-01-15T00:00:00Z') },
          }),
        })
      )
      expect(result).toEqual(mockNotOverdueChores)
    })

    it('should handle leap year February 29 dates correctly', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-03-01T12:00:00Z'))

      const mockLeapYearChores = [
        {
          id: 1,
          templateId: 1,
          userId: 2,
          assignedById: 1,
          dueDate: new Date('2024-02-29T23:00:00Z'),
          status: 'PENDING',
          penaltyApplied: false,
          penaltyPoints: null,
          createdAt: new Date('2024-02-28T10:00:00Z'),
          completedAt: null,
          notes: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockLeapYearChores)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-03-01T00:00:00Z') },
          }),
        })
      )
      expect(result).toEqual(mockLeapYearChores)
    })

    it('should handle non-leap year Feb 29 by coercing to March 1 (JS Date behavior)', async () => {
      // In JavaScript, new Date('2023-02-29') coerces to 2023-03-01
      // This test documents that behavior for Prisma/SQLite date storage
      const nonLeapFeb29 = new Date('2023-02-29T12:00:00Z')
      expect(nonLeapFeb29.getMonth()).toBe(2) // March (0-indexed)
      expect(nonLeapFeb29.getDate()).toBe(1)
    })

    it('should remain consistent across DST transitions (spring forward)', async () => {
      jest.useFakeTimers()
      // DST spring forward: 2024-03-10 02:00 becomes 03:00 in US/Eastern
      jest.setSystemTime(new Date('2024-03-11T12:00:00Z'))

      const mockOverdueChores: any[] = []

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockOverdueChores)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      // startOfToday should use UTC midnight, unaffected by local DST
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-03-11T00:00:00Z') },
          }),
        })
      )
      expect(result).toEqual(mockOverdueChores)
    })

    it('should remain consistent across DST transitions (fall back)', async () => {
      jest.useFakeTimers()
      // DST fall back: 2024-11-03 02:00 becomes 01:00 in US/Eastern
      jest.setSystemTime(new Date('2024-11-04T12:00:00Z'))

      const mockOverdueChores: any[] = []

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockOverdueChores)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      // startOfToday should use UTC midnight, unaffected by local DST
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-11-04T00:00:00Z') },
          }),
        })
      )
      expect(result).toEqual(mockOverdueChores)
    })
  })

  describe('applyOverduePenalty', () => {
    it('should throw an error if penalty has already been applied (double-penalty guard)', async () => {
      const mockAssignment = {
        id: 1,
        templateId: 1,
        userId: 2,
        assignedById: 1,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: true,
        penaltyPoints: -20,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        assignedTo: { id: 2, name: 'Test Child' },
      }

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment)

      await expect(
        overdueService.applyOverduePenalty(1, 2)
      ).rejects.toThrow('Penalty has already been applied to this assignment')
    })

    it('should use integer math for penalty calculation (no floating point)', async () => {
      const mockAssignment = {
        id: 1,
        templateId: 1,
        userId: 2,
        assignedById: 1,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 3 },
        assignedTo: { id: 2, name: 'Test Child' },
      }

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ ...mockAssignment.assignedTo, points: -5 })
      ;(prisma.choreAssignment.update as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        penaltyApplied: true,
        penaltyPoints: -5,
      })

      const result = await overdueService.applyOverduePenalty(1, 1.5)

      expect(Number.isInteger(result.penaltyPoints)).toBe(true)
      expect(result.penaltyPoints).toBe(-5)
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            points: { increment: -5 },
          }),
        })
      )
      expect(mockTx.choreAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            penaltyPoints: -5,
          }),
        })
      )
    })

    it('should calculate penalty correctly for whole number multipliers', async () => {
      const mockAssignment = {
        id: 1,
        templateId: 1,
        userId: 2,
        assignedById: 1,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        assignedTo: { id: 2, name: 'Test Child' },
      }

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ ...mockAssignment.assignedTo, points: -20 })
      ;(prisma.choreAssignment.update as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        penaltyApplied: true,
        penaltyPoints: -20,
      })

      const result = await overdueService.applyOverduePenalty(1, 2)

      expect(result.penaltyPoints).toBe(-20)
    })

    it('should throw error if assignment not found', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        overdueService.applyOverduePenalty(999, 2)
      ).rejects.toThrow('Assignment 999 not found')
    })
  })

  describe('calculateDaysOverdue', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate days correctly across DST spring forward', async () => {
      jest.useFakeTimers()
      // Set "now" to March 12, 2024 (day after DST spring forward in US)
      jest.setSystemTime(new Date('2024-03-12T12:00:00Z'))

      const dueDate = new Date('2024-03-10T12:00:00Z')
      const daysOverdue = overdueService.calculateDaysOverdue(dueDate)

      // Should be 2 days overdue
      expect(daysOverdue).toBe(2)
    })

    it('should calculate days correctly across DST fall back', async () => {
      jest.useFakeTimers()
      // Set "now" to November 5, 2024 (day after DST fall back in US)
      jest.setSystemTime(new Date('2024-11-05T12:00:00Z'))

      const dueDate = new Date('2024-11-03T12:00:00Z')
      const daysOverdue = overdueService.calculateDaysOverdue(dueDate)

      // Should be 2 days overdue
      expect(daysOverdue).toBe(2)
    })

    it('should return at least 1 day for any past due date', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))

      const dueDate = new Date('2024-01-15T10:00:00Z')
      const daysOverdue = overdueService.calculateDaysOverdue(dueDate)

      expect(daysOverdue).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getAssignmentPenaltyStatus', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('should mark assignment as overdue when dueDate is before start of today', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))

      const mockAssignment = {
        id: 1,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
      }

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment)

      const result = await overdueService.getAssignmentPenaltyStatus(1)

      expect(result).toEqual(
        expect.objectContaining({
          isOverdue: true,
          daysOverdue: expect.any(Number),
        })
      )
    })

    it('should NOT mark assignment as overdue when dueDate is today', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))

      const mockAssignment = {
        id: 1,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
      }

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment)

      const result = await overdueService.getAssignmentPenaltyStatus(1)

      expect(result).toEqual(
        expect.objectContaining({
          isOverdue: false,
          daysOverdue: 0,
        })
      )
    })

    it('should return null when assignment not found', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await overdueService.getAssignmentPenaltyStatus(999)

      expect(result).toBeNull()
    })
  })

  describe('$transaction atomicity', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should call both user.update and choreAssignment.update inside $transaction', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        assignedTo: { id: 2, name: 'Test Child' },
        assignedBy: { id: 1, name: 'Test Parent' },
      })

      mockTx.user.update.mockResolvedValue({ id: 2, points: -20 })
      mockTx.choreAssignment.update.mockResolvedValue({
        id: 1,
        penaltyApplied: true,
        penaltyPoints: -20,
      })

      await overdueService.applyOverduePenalty(1, 2)

      // $transaction should have been called (verified by mockTx operations being used)
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { points: { increment: -20 } },
        })
      )
      expect(mockTx.choreAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { penaltyApplied: true, penaltyPoints: -20 },
        })
      )
    })

    it('should throw and rollback if transaction callback fails', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        assignedTo: { id: 2, name: 'Test Child' },
      })

      // Make the transaction throw — mockTx.user.update will reject
      mockTx.user.update.mockRejectedValue(new Error('Transaction failed'))

      await expect(
        overdueService.applyOverduePenalty(1, 2)
      ).rejects.toThrow()

      // Verify no partial updates completed (choreAssignment.update was not called because user.update failed)
      expect(mockTx.choreAssignment.update).not.toHaveBeenCalled()
    })

    it('should use the tx client for all prisma operations inside the callback', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        assignedTo: { id: 2, name: 'Test Child' },
      })

      mockTx.user.update.mockResolvedValue({ id: 2, points: -20 })
      mockTx.choreAssignment.update.mockResolvedValue({
        id: 1,
        penaltyApplied: true,
        penaltyPoints: -20,
      })

      await overdueService.applyOverduePenalty(1, 2)

      // prisma.user.update (the non-tx one) should NOT be called — only tx.user.update
      // The direct prisma mock is still jest.fn() and should not be invoked
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.choreAssignment.update).not.toHaveBeenCalled()
    })
  })

  describe('integer rounding in penalty calculation', () => {
    it('should use Math.round for non-integer penalty results', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 3 },
        assignedTo: { id: 2, name: 'Test Child' },
      })

      mockTx.user.update.mockResolvedValue({ id: 2, points: -5 })
      mockTx.choreAssignment.update.mockResolvedValue({
        id: 1,
        penaltyApplied: true,
        penaltyPoints: -5,
      })

      const result = await overdueService.applyOverduePenalty(1, 1.5)

      // 3 * 1.5 = 4.5, Math.round(4.5) = 5, negated = -5
      // The current implementation uses Math.round
      expect(result.penaltyPoints).toBe(-5)
      expect(Number.isInteger(result.penaltyPoints)).toBe(true)
    })

    it('should handle odd point values with integer multiplier', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 7 },
        assignedTo: { id: 2, name: 'Test Child' },
      })

      mockTx.user.update.mockResolvedValue({ id: 2, points: -7 })
      mockTx.choreAssignment.update.mockResolvedValue({
        id: 1,
        penaltyApplied: true,
        penaltyPoints: -7,
      })

      const result = await overdueService.applyOverduePenalty(1, 1)

      expect(result.penaltyPoints).toBe(-7)
    })

    it('should produce consistent results for the same inputs', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))

      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 5 },
        assignedTo: { id: 2, name: 'Test Child' },
      })

      mockTx.user.update.mockResolvedValue({ id: 2, points: -10 })
      mockTx.choreAssignment.update.mockResolvedValue({
        id: 1,
        penaltyApplied: true,
        penaltyPoints: -10,
      })

      const result1 = await overdueService.applyOverduePenalty(1, 2)
      // Reset mock assignment for a second call with a different assignment
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        templateId: 1,
        userId: 2,
        dueDate: new Date('2024-01-15T10:00:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 5 },
        assignedTo: { id: 2, name: 'Test Child' },
      })

      const result2 = await overdueService.applyOverduePenalty(2, 2)

      expect(result1.penaltyPoints).toBe(-10)
      expect(result2.penaltyPoints).toBe(-10)
    })
  })

  describe('timezone boundary in overdue detection', () => {
    it('should treat UTC midnight as the cutoff, independent of user timezone', async () => {
      jest.useFakeTimers()
      // Chore due at 2024-01-16T01:00:00Z (Jan 16 1am UTC)
      // Now set to 2024-01-16T00:30:00Z (Jan 16 12:30am UTC)
      jest.setSystemTime(new Date('2024-01-16T00:30:00Z'))

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      // Due date (01:00) is AFTER start of today (00:00), so NOT overdue
      // findMany should query dueDate < 2024-01-16T00:00:00Z
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-01-16T00:00:00Z') },
          }),
        })
      )
      expect(result).toEqual([])
    })

    it('should detect overdue correctly for chore due at 23:59 UTC on previous day', async () => {
      jest.useFakeTimers()
      // Chore due at 2024-01-15T23:59:00Z
      // Now set to 2024-01-16T00:01:00Z
      jest.setSystemTime(new Date('2024-01-16T00:01:00Z'))

      const mockOverdue = [{
        id: 1,
        templateId: 1,
        userId: 2,
        assignedById: 1,
        dueDate: new Date('2024-01-15T23:59:00Z'),
        status: 'PENDING',
        penaltyApplied: false,
        penaltyPoints: null,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        completedAt: null,
        notes: null,
        choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        assignedTo: { id: 2, name: 'Test Child' },
        assignedBy: { id: 1, name: 'Test Parent' },
      }]

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockOverdue)

      const result = await overdueService.findOverdueChoresWithoutPenalty()

      expect(result).toHaveLength(1)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: new Date('2024-01-16T00:00:00Z') },
          }),
        })
      )
    })
  })

  describe('processOverdueChores', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))

      // Mock getFamilyPenaltySettings chain:
      // getFamilyPenaltySettings -> getAllParents -> prisma.user.findMany -> getOrCreateSettings
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 1, role: 'PARENT', email: 'parent@test.com', name: 'Test Parent', points: 100 },
      ])
      ;(getOrCreateSettings as jest.Mock).mockResolvedValue({
        ...mockNotificationSettings.default,
        overduePenaltyEnabled: true,
        overduePenaltyMultiplier: 2,
        ntfyTopic: 'test-topic',
      })
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should process multiple overdue chores in parallel', async () => {
      // Mock overdue chores
      const mockChores = [
        {
          id: 1, templateId: 1, userId: 2, assignedById: 1,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          createdAt: new Date('2024-01-14T10:00:00Z'),
          completedAt: null, notes: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
        {
          id: 2, templateId: 2, userId: 2, assignedById: 1,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          createdAt: new Date('2024-01-14T10:00:00Z'),
          completedAt: null, notes: null,
          choreTemplate: { id: 2, title: 'Clean Room', points: 15 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]

      // Mock the findOverdueChoresWithoutPenalty call (via choreAssignment.findMany)
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockChores)

      // Mock the individual applyOverduePenalty calls
      // assignment.findUnique is called for each
      ;(prisma.choreAssignment.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 1, templateId: 1, userId: 2,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        })
        .mockResolvedValueOnce({
          id: 2, templateId: 2, userId: 2,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          choreTemplate: { id: 2, title: 'Clean Room', points: 15 },
        })

      // Mock for notifications
      mockTx.user.update.mockResolvedValue({})
      mockTx.choreAssignment.update.mockResolvedValue({})

      const result = await overdueService.processOverdueChores()

      expect(result.processed).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(result.penalties).toHaveLength(2)
    })

    it('should isolate per-chore errors and continue processing others', async () => {
      // Mock only one chore
      const mockChores = [
        {
          id: 1, templateId: 1, userId: 2, assignedById: 1,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          createdAt: new Date('2024-01-14T10:00:00Z'),
          completedAt: null, notes: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
        {
          id: 2, templateId: 2, userId: 2, assignedById: 1,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          createdAt: new Date('2024-01-14T10:00:00Z'),
          completedAt: null, notes: null,
          choreTemplate: { id: 2, title: 'Clean Room', points: 15 },
          assignedTo: { id: 2, name: 'Test Child' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]

      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockChores)

      // First chore succeeds
      ;(prisma.choreAssignment.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 1, templateId: 1, userId: 2,
          dueDate: new Date('2024-01-15T10:00:00Z'),
          status: 'PENDING', penaltyApplied: false, penaltyPoints: null,
          choreTemplate: { id: 1, title: 'Wash Dishes', points: 10 },
        })
        // Second chore throws - simulate by making findUnique reject
        .mockRejectedValueOnce(new Error('Simulated failure'))

      mockTx.user.update.mockResolvedValue({})
      mockTx.choreAssignment.update.mockResolvedValue({})

      const result = await overdueService.processOverdueChores()

      expect(result.processed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe('Simulated failure')
    })

    it('should return empty results when no overdue chores exist', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      const result = await overdueService.processOverdueChores()

      expect(result.processed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.penalties).toHaveLength(0)
    })

    it('should return early when penalty system is disabled', async () => {
      ;(getOrCreateSettings as jest.Mock).mockResolvedValue({
        ...mockNotificationSettings.default,
        overduePenaltyEnabled: false,
      })

      const result = await overdueService.processOverdueChores()

      expect(result.processed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })
})
