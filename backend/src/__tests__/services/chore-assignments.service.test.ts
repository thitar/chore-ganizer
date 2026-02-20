/**
 * Tests for Chore Assignments Service
 * 
 * Tests cover:
 * - getAllAssignments: Fetch assignments with filters
 * - getAssignmentById: Fetch single assignment
 * - createAssignment: Create new assignment
 * - updateAssignment: Update assignment
 * - completeAssignment: Complete and award points
 * - deleteAssignment: Delete assignment
 * - getOverdueAssignments: Fetch overdue assignments
 */

import * as assignmentsService from '../../services/chore-assignments.service'
import prisma from '../../config/database'
import { mockUsers, mockAssignments, mockTemplates } from '../test-helpers'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      const mockTx = {
        choreAssignment: {
          update: jest.fn().mockResolvedValue({
            ...mockAssignments.completed,
            choreTemplate: mockTemplates.dishes,
            assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
            assignedBy: { id: 1, name: 'Test Parent' },
          }),
        },
        user: {
          update: jest.fn().mockResolvedValue({ ...mockUsers.child, points: 60 }),
        },
      }
      return callback(mockTx)
    }),
  },
}))

describe('Chore Assignments Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllAssignments', () => {
    const mockAssignmentsWithDetails = [
      {
        ...mockAssignments.pending,
        choreTemplate: mockTemplates.dishes,
        assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
        assignedBy: { id: 1, name: 'Test Parent' },
      },
    ]

    it('should return all assignments without filters', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      const result = await assignmentsService.getAllAssignments()

      expect(result).toHaveLength(1)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      )
    })

    it('should filter by status', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      await assignmentsService.getAllAssignments({ status: 'PENDING' })

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        })
      )
    })

    it('should filter overdue assignments correctly', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      await assignmentsService.getAllAssignments({ status: 'OVERDUE' })

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            dueDate: { lt: expect.any(Date) },
          },
        })
      )
    })

    it('should filter by assignedToId', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      await assignmentsService.getAllAssignments({ assignedToId: 2 })

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: 2 },
        })
      )
    })

    it('should filter by date range', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      const fromDate = new Date('2024-01-01')
      const toDate = new Date('2024-12-31')

      await assignmentsService.getAllAssignments({ 
        dueDateFrom: fromDate,
        dueDateTo: toDate,
      })

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: {
              gte: fromDate,
              lte: toDate,
            },
          },
        })
      )
    })

    it('should add isOverdue computed field', async () => {
      const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      const overdueAssignment = {
        ...mockAssignments.pending,
        dueDate: pastDue,
        status: 'PENDING',
        choreTemplate: mockTemplates.dishes,
        assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
        assignedBy: { id: 1, name: 'Test Parent' },
      }
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([overdueAssignment])

      const result = await assignmentsService.getAllAssignments()

      expect((result[0] as any).isOverdue).toBe(true)
    })
  })

  describe('getAssignmentById', () => {
    const mockAssignmentWithDetails = {
      ...mockAssignments.pending,
      choreTemplate: mockTemplates.dishes,
      assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
      assignedBy: { id: 1, name: 'Test Parent' },
    }

    it('should return assignment when found', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignmentWithDetails)

      const result = await assignmentsService.getAssignmentById(1)

      expect(result).toEqual(mockAssignmentWithDetails)
      expect(prisma.choreAssignment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({
          choreTemplate: expect.any(Object),
          assignedTo: expect.any(Object),
          assignedBy: expect.any(Object),
        }),
      })
    })

    it('should return null when not found', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await assignmentsService.getAssignmentById(999)

      expect(result).toBeNull()
    })
  })

  describe('createAssignment', () => {
    const mockCreatedAssignment = {
      ...mockAssignments.pending,
      choreTemplate: mockTemplates.dishes,
      assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
      assignedBy: { id: 1, name: 'Test Parent' },
    }

    it('should create assignment with all fields', async () => {
      ;(prisma.choreAssignment.create as jest.Mock).mockResolvedValue(mockCreatedAssignment)

      const data = {
        choreTemplateId: 1,
        assignedToId: 2,
        dueDate: new Date(),
        notes: 'Test notes',
      }

      const result = await assignmentsService.createAssignment(data, 1)

      expect(result).toBeDefined()
      expect(result.id).toBe(mockCreatedAssignment.id)
      expect(prisma.choreAssignment.create).toHaveBeenCalledWith({
        data: {
          choreTemplateId: 1,
          assignedToId: 2,
          assignedById: 1,
          dueDate: data.dueDate,
          notes: 'Test notes',
        },
        include: expect.objectContaining({
          choreTemplate: expect.any(Object),
          assignedTo: expect.any(Object),
          assignedBy: expect.any(Object),
        }),
      })
    })

    it('should create assignment without notes', async () => {
      ;(prisma.choreAssignment.create as jest.Mock).mockResolvedValue(mockCreatedAssignment)

      const data = {
        choreTemplateId: 1,
        assignedToId: 2,
        dueDate: new Date(),
      }

      const result = await assignmentsService.createAssignment(data, 1)

      expect(result).toBeDefined()
      expect(prisma.choreAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: undefined,
          }),
        })
      )
    })
  })

  describe('updateAssignment', () => {
    const mockUpdatedAssignment = {
      ...mockAssignments.pending,
      notes: 'Updated notes',
      choreTemplate: mockTemplates.dishes,
      assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
      assignedBy: { id: 1, name: 'Test Parent' },
    }

    it('should update assignment notes', async () => {
      ;(prisma.choreAssignment.update as jest.Mock).mockResolvedValue(mockUpdatedAssignment)

      const result = await assignmentsService.updateAssignment(1, { notes: 'Updated notes' })

      expect(result).toEqual(mockUpdatedAssignment)
    })

    it('should update assignment due date', async () => {
      const newDate = new Date('2024-12-31')
      ;(prisma.choreAssignment.update as jest.Mock).mockResolvedValue({
        ...mockUpdatedAssignment,
        dueDate: newDate,
      })

      const result = await assignmentsService.updateAssignment(1, { dueDate: newDate })

      expect(result.dueDate).toEqual(newDate)
    })

    it('should reassign to different user', async () => {
      ;(prisma.choreAssignment.update as jest.Mock).mockResolvedValue({
        ...mockUpdatedAssignment,
        assignedToId: 3,
        assignedTo: { id: 3, name: 'Another Child', color: '#FF0000' },
      })

      const result = await assignmentsService.updateAssignment(1, { assignedToId: 3 })

      expect(result.assignedToId).toBe(3)
    })
  })

  describe('completeAssignment', () => {
    const mockPendingAssignment = {
      ...mockAssignments.pending,
      choreTemplate: mockTemplates.dishes,
      assignedToId: 2,
    }

    it('should complete assignment and award full points', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockPendingAssignment)

      const result = await assignmentsService.completeAssignment(1, 2)

      expect(result).toBeDefined()
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should complete assignment with custom points', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockPendingAssignment)

      await assignmentsService.completeAssignment(1, 1, {
        customPoints: 5,
        isParent: true,
      })

      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should throw error if assignment not found', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        assignmentsService.completeAssignment(999, 2)
      ).rejects.toThrow('Assignment not found')
    })

    it('should throw error if already completed', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
        ...mockPendingAssignment,
        status: 'COMPLETED',
      })

      await expect(
        assignmentsService.completeAssignment(1, 2)
      ).rejects.toThrow('Assignment is already completed')
    })

    it('should throw error if child tries to complete another\'s assignment', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockPendingAssignment)

      await expect(
        assignmentsService.completeAssignment(1, 3, { isParent: false })
      ).rejects.toThrow('You can only complete your own assignments')
    })

    it('should allow parent to complete any assignment', async () => {
      ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockPendingAssignment)

      await assignmentsService.completeAssignment(1, 1, { isParent: true })

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('deleteAssignment', () => {
    it('should delete assignment', async () => {
      ;(prisma.choreAssignment.delete as jest.Mock).mockResolvedValue(mockAssignments.pending)

      await assignmentsService.deleteAssignment(1)

      expect(prisma.choreAssignment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })
  })

  describe('getOverdueAssignments', () => {
    it('should return only pending assignments with past due dates', async () => {
      const overdueAssignments = [
        {
          ...mockAssignments.overdue,
          choreTemplate: mockTemplates.dishes,
          assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(overdueAssignments)

      const result = await assignmentsService.getOverdueAssignments()

      expect(result).toHaveLength(1)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            dueDate: { lt: expect.any(Date) },
          },
        })
      )
    })

    it('should return empty array when no overdue assignments', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      const result = await assignmentsService.getOverdueAssignments()

      expect(result).toEqual([])
    })
  })
})
