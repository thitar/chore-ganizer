import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreOccurrence: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    recurringChoreFixedAssignee: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('../../services/recurring-chores/occurrence-management.service', () => ({
  attachAssignedUsersToOccurrences: jest.fn(),
  updateRoundRobinAfterCompletion: jest.fn(),
  awardPointsForCompletion: jest.fn(),
}))

jest.mock('../../jobs/occurrenceJob', () => ({
  generateDailyOccurrences: jest.fn(),
}))

import prisma from '../../config/database'
import * as occurrenceManagement from '../../services/recurring-chores/occurrence-management.service'
import {
  listOccurrences,
  completeOccurrence,
  skipOccurrence,
  unskipOccurrence,
  triggerOccurrenceGeneration,
} from '../../controllers/recurring-chores-occurrences.controller'
import { AppError } from '../../middleware/errorHandler'

// Mock data matching ChoreOccurrence structure
const pendingOccurrence = {
  id: 1,
  recurringChoreId: 1,
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  status: 'PENDING' as const,
  assignedUserIds: JSON.stringify([2]),
  roundRobinIndex: null,
  completedAt: null,
  completedById: null,
  skippedAt: null,
  skippedById: null,
  skipReason: null,
  pointsAwarded: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  recurringChore: {
    id: 1,
    title: 'Feed Pet',
    points: 5,
    icon: '🐕',
    color: '#F59E0B',
    assignmentMode: 'FIXED',
    roundRobinPool: [],
  },
  completedBy: undefined,
  skippedBy: undefined,
}

const occurrenceWithRoundRobin = {
  ...pendingOccurrence,
  roundRobinIndex: 0,
  recurringChore: {
    ...pendingOccurrence.recurringChore,
    assignmentMode: 'ROUND_ROBIN',
    roundRobinPool: [
      { user: { id: 2, name: 'Child1' }, order: 0 },
      { user: { id: 3, name: 'Child2' }, order: 1 },
    ],
  },
}

describe('Recurring Chores Occurrences Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(occurrenceManagement.attachAssignedUsersToOccurrences as jest.Mock).mockImplementation(
      (ocs: any[]) => ocs
    )
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('listOccurrences', () => {
    it('should return 200 with occurrences without filter', async () => {
      const occurrences = [pendingOccurrence]
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue(occurrences)

      await listOccurrences(mockReq as Request, mockRes as Response)

      expect(prisma.choreOccurrence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.any(Object),
            recurringChore: { isActive: true },
          }),
        })
      )
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { occurrences },
      })
    })

    it('should filter by userId when assignedToMe is true', async () => {
      const occurrences = [pendingOccurrence]
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue(occurrences)

      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        query: { assignedToMe: 'true' },
      })

      await listOccurrences(mockReq as Request, mockRes as Response)

      expect(prisma.choreOccurrence.findMany).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { occurrences },
      })
    })

    it('should filter by explicit userId', async () => {
      const occurrences = [pendingOccurrence]
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue(occurrences)

      mockReq = createMockRequest({
        query: { userId: '2' },
      })

      await listOccurrences(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { occurrences },
      })
    })

    it('should filter by status', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([])

      mockReq = createMockRequest({
        query: { status: 'COMPLETED' },
      })

      await listOccurrences(mockReq as Request, mockRes as Response)

      expect(prisma.choreOccurrence.findMany).toHaveBeenCalled()
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      await expect(
        listOccurrences(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('completeOccurrence', () => {
    it('should return 200 with completed occurrence on success', async () => {
      const updatedOccurrence = {
        ...pendingOccurrence,
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: 1,
        pointsAwarded: 5,
        recurringChore: { id: 1, title: 'Feed Pet', points: 5 },
        completedBy: { id: 1, name: 'Parent' },
      }
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(pendingOccurrence)
      ;(prisma.choreOccurrence.update as jest.Mock).mockResolvedValue(updatedOccurrence)
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 2, name: 'Child1' }])
      ;(occurrenceManagement.awardPointsForCompletion as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await completeOccurrence(mockReq as Request, mockRes as Response)

      expect(prisma.choreOccurrence.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      })
      expect(prisma.choreOccurrence.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          completedById: 1,
          pointsAwarded: 5,
        },
        include: expect.any(Object),
      })
      expect(occurrenceManagement.awardPointsForCompletion).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          occurrence: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      })
    })

    it('should handle round-robin completion', async () => {
      const updatedOccurrence = {
        ...occurrenceWithRoundRobin,
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: 2,
        pointsAwarded: 5,
      }
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(occurrenceWithRoundRobin)
      ;(prisma.choreOccurrence.update as jest.Mock).mockResolvedValue(updatedOccurrence)
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 2, name: 'Child1' }])
      ;(occurrenceManagement.updateRoundRobinAfterCompletion as jest.Mock).mockResolvedValue(undefined)
      ;(occurrenceManagement.awardPointsForCompletion as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        params: { id: '1' },
      })

      await completeOccurrence(mockReq as Request, mockRes as Response)

      expect(occurrenceManagement.updateRoundRobinAfterCompletion).toHaveBeenCalled()
    })

    it('should throw 400 for invalid occurrence ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        completeOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if occurrence not found', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        completeOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 if occurrence is not pending', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue({
        ...pendingOccurrence,
        status: 'COMPLETED',
      })

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        completeOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(pendingOccurrence)
      ;(prisma.choreOccurrence.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await expect(
        completeOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('skipOccurrence', () => {
    it('should return 200 with skipped occurrence on success', async () => {
      const skippedOccurrence = {
        ...pendingOccurrence,
        status: 'SKIPPED',
        skippedAt: new Date(),
        skippedById: 1,
        skipReason: 'Vacation',
      }
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(pendingOccurrence)
      ;(prisma.choreOccurrence.update as jest.Mock).mockResolvedValue(skippedOccurrence)
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 2, name: 'Child1' }])

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { reason: 'Vacation' },
      })

      await skipOccurrence(mockReq as Request, mockRes as Response)

      expect(prisma.choreOccurrence.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'SKIPPED',
          skippedAt: expect.any(Date),
          skippedById: 1,
          skipReason: 'Vacation',
        },
        include: expect.any(Object),
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          occurrence: expect.objectContaining({ status: 'SKIPPED' }),
        }),
      })
    })

    it('should throw 400 for invalid occurrence ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        skipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if occurrence not found', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        skipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 if occurrence is not pending', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue({
        ...pendingOccurrence,
        status: 'COMPLETED',
      })

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        skipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(pendingOccurrence)
      ;(prisma.choreOccurrence.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await expect(
        skipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('unskipOccurrence', () => {
    const skippedOccurrence = {
      ...pendingOccurrence,
      status: 'SKIPPED' as const,
      skippedAt: new Date(),
      skippedById: 1,
      skipReason: 'Vacation',
    }

    it('should return 200 with restored occurrence on success', async () => {
      const restoredOccurrence = {
        ...pendingOccurrence,
        skippedAt: null,
        skippedById: null,
        skipReason: null,
      }
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(skippedOccurrence)
      ;(prisma.choreOccurrence.update as jest.Mock).mockResolvedValue(restoredOccurrence)
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 2, name: 'Child1' }])

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await unskipOccurrence(mockReq as Request, mockRes as Response)

      expect(prisma.choreOccurrence.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'PENDING',
          skippedAt: null,
          skippedById: null,
          skipReason: null,
        },
        include: expect.any(Object),
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { occurrence: expect.objectContaining(restoredOccurrence) },
      })
    })

    it('should throw 400 for invalid occurrence ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        unskipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if occurrence not found', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        unskipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 if occurrence is not skipped', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(pendingOccurrence)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        unskipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(skippedOccurrence)
      ;(prisma.choreOccurrence.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        unskipOccurrence(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('triggerOccurrenceGeneration', () => {
    it('should return 200 with count on success', async () => {
      const { generateDailyOccurrences } = require('../../jobs/occurrenceJob')
      ;(generateDailyOccurrences as jest.Mock).mockResolvedValue(10)

      await triggerOccurrenceGeneration(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Generated 10 occurrences',
          count: 10,
          targetDate: expect.any(String),
        },
      })
    })

    it('should accept a custom date parameter', async () => {
      const { generateDailyOccurrences } = require('../../jobs/occurrenceJob')
      ;(generateDailyOccurrences as jest.Mock).mockResolvedValue(5)

      mockReq = createMockRequest({
        query: { date: '2024-06-15' },
      })

      await triggerOccurrenceGeneration(mockReq as Request, mockRes as Response)

      expect(generateDailyOccurrences).toHaveBeenCalledWith(expect.any(Date))
    })

    it('should return 500 on generation error', async () => {
      const { generateDailyOccurrences } = require('../../jobs/occurrenceJob')
      ;(generateDailyOccurrences as jest.Mock).mockRejectedValue(new Error('Generation error'))

      await triggerOccurrenceGeneration(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to generate occurrences',
          details: 'Generation error',
        },
      })
    })
  })
})
