import { createMockRequest, createMockResponse, mockRecurringChores } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    recurringChore: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('../../services/recurrence.service', () => ({
  RecurrenceService: {
    isValidRule: jest.fn(),
  },
}))

jest.mock('../../services/recurring-chores/occurrence.service', () => ({
  generateOccurrencesForChore: jest.fn(),
}))

jest.mock('../../services/recurring-chores/transform.service', () => ({
  transformRecurringChore: jest.fn((x: any) => x),
}))

jest.mock('../../schemas/validation.schemas', () => ({
  recurrenceRuleSchema: {
    safeParse: jest.fn(),
  },
}))

jest.mock('../../services/recurring-chores/recurring-chore-management.service', () => ({
  RECURRING_CHORE_INCLUDE: { category: true, fixedAssignees: true, roundRobinPool: true },
  updateRecurringChoreAssignments: jest.fn(),
  regenerateFutureOccurrences: jest.fn(),
}))

import prisma from '../../config/database'
import { RecurrenceService } from '../../services/recurrence.service'
import { generateOccurrencesForChore } from '../../services/recurring-chores/occurrence.service'
import { recurrenceRuleSchema } from '../../schemas/validation.schemas'
import { updateRecurringChoreAssignments, regenerateFutureOccurrences } from '../../services/recurring-chores/recurring-chore-management.service'
import {
  createRecurringChore,
  listRecurringChores,
  getRecurringChore,
  updateRecurringChore,
  deleteRecurringChore,
  toggleRecurringChoreActive,
} from '../../controllers/recurring-chores-crud.controller'
import { AppError } from '../../middleware/errorHandler'

const validRecurrenceRule = { frequency: 'WEEKLY', interval: 1, byDayOfWeek: [6] }

describe('Recurring Chores CRUD Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(recurrenceRuleSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: validRecurrenceRule })
    ;(RecurrenceService.isValidRule as unknown as jest.Mock).mockReturnValue(true)
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('createRecurringChore', () => {
    const validBody = {
      title: 'Weekly Cleanup',
      description: 'Clean the house',
      points: 20,
      categoryId: 1,
      recurrenceRule: validRecurrenceRule,
      startDate: '2024-01-01',
      assignmentMode: 'FIXED',
      fixedAssigneeIds: [2],
    }

    it('should return 201 with created chore on success', async () => {
      const createdChore = { ...mockRecurringChores.daily, id: 3, title: 'Weekly Cleanup' }
      ;(prisma.recurringChore.create as jest.Mock).mockResolvedValue(createdChore)
      ;(generateOccurrencesForChore as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: validBody,
      })

      await createRecurringChore(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.create).toHaveBeenCalledWith({
        data: {
          title: 'Weekly Cleanup',
          description: 'Clean the house',
          points: 20,
          categoryId: 1,
          createdById: 1,
          startDate: expect.any(Date),
          recurrenceRule: validRecurrenceRule,
          assignmentMode: 'FIXED',
          isActive: true,
          fixedAssignees: { create: [{ userId: 2 }] },
          roundRobinPool: { create: [] },
        },
        include: expect.any(Object),
      })
      expect(generateOccurrencesForChore).toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { recurringChore: createdChore },
      })
    })

    it('should throw 400 if required fields are missing', async () => {
      mockReq = createMockRequest({
        body: { title: 'Incomplete' },
      })

      await expect(
        createRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for invalid assignment mode', async () => {
      mockReq = createMockRequest({
        body: { ...validBody, assignmentMode: 'INVALID' },
      })

      await expect(
        createRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for invalid recurrence rule', async () => {
      ;(recurrenceRuleSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Invalid'),
      })

      mockReq = createMockRequest({
        body: { ...validBody, recurrenceRule: { frequency: 'INVALID' } },
      })

      await expect(
        createRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for FIXED mode without assignees', async () => {
      mockReq = createMockRequest({
        body: { ...validBody, fixedAssigneeIds: [] },
      })

      await expect(
        createRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for ROUND_ROBIN mode without pool members', async () => {
      mockReq = createMockRequest({
        body: { ...validBody, assignmentMode: 'ROUND_ROBIN', roundRobinPoolIds: [] },
      })

      await expect(
        createRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.recurringChore.create as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: validBody,
      })

      await expect(
        createRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('listRecurringChores', () => {
    it('should return 200 with active chores by default', async () => {
      const chores = [mockRecurringChores.daily, mockRecurringChores.weekly]
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue(chores)

      await listRecurringChores(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { recurringChores: chores },
      })
    })

    it('should include inactive chores when query param is set', async () => {
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([])

      mockReq = createMockRequest({
        query: { includeInactive: 'true' },
      })

      await listRecurringChores(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.recurringChore.findMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      await expect(
        listRecurringChores(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('getRecurringChore', () => {
    it('should return 200 with chore on success', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(mockRecurringChores.daily)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await getRecurringChore(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { recurringChore: mockRecurringChores.daily },
      })
    })

    it('should throw 400 for invalid ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        getRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if not found', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        getRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        getRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('updateRecurringChore', () => {
    const existingChore = {
      ...mockRecurringChores.daily,
      fixedAssignees: [{ userId: 2, recurringChoreId: 1 }],
      roundRobinPool: [],
    }

    it('should return 200 with updated chore on success', async () => {
      const updatedChore = { ...existingChore, title: 'Updated Title' }
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(existingChore)
      ;(prisma.recurringChore.update as jest.Mock).mockResolvedValue(updatedChore)

      mockReq = createMockRequest({
        params: { id: '1' },
        body: {
          title: 'Updated Title',
          points: 15,
        },
      })

      await updateRecurringChore(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated Title', points: 15 },
        include: expect.any(Object),
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { recurringChore: updatedChore },
      })
    })

    it('should handle assignment mode and recurrence rule updates', async () => {
      const updatedChore = { ...existingChore, assignmentMode: 'ROUND_ROBIN' }
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(existingChore)
      ;(prisma.recurringChore.update as jest.Mock).mockResolvedValue(updatedChore)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: {
          assignmentMode: 'ROUND_ROBIN',
          fixedAssigneeIds: [2],
          roundRobinPoolIds: [3],
          recurrenceRule: validRecurrenceRule,
          startDate: '2024-06-01',
        },
      })

      await updateRecurringChore(mockReq as Request, mockRes as Response)

      expect(updateRecurringChoreAssignments).toHaveBeenCalled()
      expect(regenerateFutureOccurrences).toHaveBeenCalled()
    })

    it('should throw 400 for invalid ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        updateRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if not found', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
        body: { title: 'Updated' },
      })

      await expect(
        updateRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(existingChore)
      ;(prisma.recurringChore.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { title: 'Updated' },
      })

      await expect(
        updateRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('deleteRecurringChore', () => {
    it('should soft-delete (deactivate) the chore on success', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(mockRecurringChores.daily)
      ;(prisma.recurringChore.update as jest.Mock).mockResolvedValue({ ...mockRecurringChores.daily, isActive: false })

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await deleteRecurringChore(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      })
      expect(prisma.recurringChore.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Recurring chore deleted successfully' },
      })
    })

    it('should throw 400 for invalid ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        deleteRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if not found', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        deleteRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate prisma errors', async () => {
      ;(prisma.recurringChore.findFirst as jest.Mock).mockResolvedValue(mockRecurringChores.daily)
      ;(prisma.recurringChore.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        deleteRecurringChore(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('toggleRecurringChoreActive', () => {
    it('should return 200 with toggled chore on success', async () => {
      const toggledChore = { ...mockRecurringChores.daily, isActive: false }
      ;(prisma.recurringChore.update as jest.Mock).mockResolvedValue(toggledChore)

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { isActive: false },
      })

      await toggleRecurringChoreActive(mockReq as Request, mockRes as Response)

      expect(prisma.recurringChore.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
        include: {
          category: true,
          fixedAssignees: true,
          roundRobinPool: { include: { user: true } },
        },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { recurringChore: toggledChore },
      })
    })

    it('should throw 400 for invalid ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        toggleRecurringChoreActive(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 with P2025 prisma error', async () => {
      const prismaError = new Error('Record not found') as any
      prismaError.code = 'P2025'
      ;(prisma.recurringChore.update as jest.Mock).mockRejectedValue(prismaError)

      mockReq = createMockRequest({
        params: { id: '999' },
        body: { isActive: true },
      })

      await expect(
        toggleRecurringChoreActive(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate non-P2025 prisma errors', async () => {
      ;(prisma.recurringChore.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { isActive: true },
      })

      await expect(
        toggleRecurringChoreActive(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })
})
