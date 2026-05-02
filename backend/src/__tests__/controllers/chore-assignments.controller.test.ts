import { createMockRequest, createMockResponse, mockTemplates, mockAssignments } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/chore-assignments.service', () => ({
  getAllAssignments: jest.fn(),
  getUpcomingAssignments: jest.fn(),
  getOverdueAssignments: jest.fn(),
  getAssignmentsForMonth: jest.fn(),
  getAssignmentById: jest.fn(),
  createAssignment: jest.fn(),
  updateAssignment: jest.fn(),
  completeAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
}))

jest.mock('../../services/chore-templates.service', () => ({
  getTemplateById: jest.fn(),
}))

jest.mock('../../services/notifications.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 }),
}))

jest.mock('../../services/notification-settings.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(true),
}))

jest.mock('../../services/audit.service', () => ({
  getAuditContext: jest.fn(),
  createAuditLog: jest.fn(),
}))

import * as assignmentsService from '../../services/chore-assignments.service'
import * as templatesService from '../../services/chore-templates.service'
import * as notificationsService from '../../services/notifications.service'
import * as notificationSettingsService from '../../services/notification-settings.service'
import * as auditService from '../../services/audit.service'
import {
  getAssignments, getUpcoming, getOverdue, getCalendar, getAssignment,
  createAssignment, updateAssignment, completeAssignment, deleteAssignment,
} from '../../controllers/chore-assignments.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Chore Assignments Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auditService.getAuditContext as jest.Mock).mockReturnValue({
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    })
    ;(auditService.createAuditLog as jest.Mock).mockResolvedValue(undefined)
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getAssignments', () => {
    it('should return 200 with assignments on success', async () => {
      const assignments = [mockAssignments.pending, mockAssignments.completed]
      ;(assignmentsService.getAllAssignments as jest.Mock).mockResolvedValue(assignments)

      mockReq = createMockRequest({
        query: { status: 'PENDING', userId: '2', dueDateFrom: '2024-01-01', dueDateTo: '2024-12-31' },
      })

      await getAssignments(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getAllAssignments).toHaveBeenCalledWith({
        status: 'PENDING',
        userId: 2,
        dueDateFrom: expect.any(Date),
        dueDateTo: expect.any(Date),
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignments },
      })
    })

    it('should work without query params', async () => {
      ;(assignmentsService.getAllAssignments as jest.Mock).mockResolvedValue([])

      await getAssignments(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getAllAssignments).toHaveBeenCalledWith({})
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getAllAssignments as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      await expect(
        getAssignments(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('getUpcoming', () => {
    it('should return 200 with upcoming assignments', async () => {
      const assignments = [mockAssignments.pending]
      ;(assignmentsService.getUpcomingAssignments as jest.Mock).mockResolvedValue(assignments)

      mockReq = createMockRequest({
        query: { days: '14', userId: '2' },
      })

      await getUpcoming(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getUpcomingAssignments).toHaveBeenCalledWith(14, 2)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignments },
      })
    })

    it('should use defaults when query params are missing', async () => {
      ;(assignmentsService.getUpcomingAssignments as jest.Mock).mockResolvedValue([])

      await getUpcoming(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getUpcomingAssignments).toHaveBeenCalledWith(7, undefined)
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getUpcomingAssignments as jest.Mock).mockRejectedValue(
        new Error('Upcoming error')
      )

      await expect(
        getUpcoming(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Upcoming error')
    })
  })

  describe('getOverdue', () => {
    it('should return 200 with overdue assignments', async () => {
      const assignments = [mockAssignments.overdue]
      ;(assignmentsService.getOverdueAssignments as jest.Mock).mockResolvedValue(assignments)

      await getOverdue(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getOverdueAssignments).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignments },
      })
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getOverdueAssignments as jest.Mock).mockRejectedValue(
        new Error('Overdue error')
      )

      await expect(
        getOverdue(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Overdue error')
    })
  })

  describe('getCalendar', () => {
    it('should return 200 with calendar assignments', async () => {
      const assignments = [mockAssignments.pending]
      ;(assignmentsService.getAssignmentsForMonth as jest.Mock).mockResolvedValue(assignments)

      mockReq = createMockRequest({
        query: { year: '2024', month: '6', userId: '2' },
      })

      await getCalendar(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getAssignmentsForMonth).toHaveBeenCalledWith(2024, 6, 2)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignments, year: 2024, month: 6 },
      })
    })

    it('should use defaults when query params are missing', async () => {
      ;(assignmentsService.getAssignmentsForMonth as jest.Mock).mockResolvedValue([])

      await getCalendar(mockReq as Request, mockRes as Response)

      const now = new Date()
      expect(assignmentsService.getAssignmentsForMonth).toHaveBeenCalledWith(
        now.getFullYear(), now.getMonth() + 1, undefined
      )
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getAssignmentsForMonth as jest.Mock).mockRejectedValue(
        new Error('Calendar error')
      )

      mockReq = createMockRequest({
        query: { year: '2024', month: '6' },
      })

      await expect(
        getCalendar(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Calendar error')
    })
  })

  describe('getAssignment', () => {
    it('should return 200 with assignment on success', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(mockAssignments.pending)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await getAssignment(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getAssignmentById).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment: mockAssignments.pending },
      })
    })

    it('should throw 400 for invalid assignment ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        getAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if assignment not found', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        getAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockRejectedValue(
        new Error('Not found')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        getAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Not found')
    })
  })

  describe('createAssignment', () => {
    const mockBody = { templateId: 1, userId: 2, dueDate: '2024-06-15', notes: 'Test' }

    it('should return 201 with assignment on success', async () => {
      const newAssignment = { ...mockAssignments.pending, id: 10 }
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)
      ;(assignmentsService.createAssignment as jest.Mock).mockResolvedValue(newAssignment)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: mockBody,
      })

      await createAssignment(mockReq as Request, mockRes as Response)

      expect(templatesService.getTemplateById).toHaveBeenCalledWith(1)
      expect(assignmentsService.createAssignment).toHaveBeenCalledWith(
        { templateId: 1, userId: 2, dueDate: expect.any(Date), notes: 'Test' },
        1
      )
      expect(notificationsService.createNotification).toHaveBeenCalled()
      expect(notificationSettingsService.sendPushNotification).toHaveBeenCalled()
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment: newAssignment },
      })
    })

    it('should throw 400 if required fields are missing', async () => {
      mockReq = createMockRequest({
        body: { notes: 'Test' },
      })

      await expect(
        createAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if template not found', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: mockBody,
      })

      await expect(
        createAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)
      ;(assignmentsService.createAssignment as jest.Mock).mockRejectedValue(
        new Error('Create error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: mockBody,
      })

      await expect(
        createAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Create error')
    })
  })

  describe('updateAssignment', () => {
    it('should return 200 with updated assignment on success', async () => {
      const updatedAssignment = { ...mockAssignments.pending, notes: 'Updated notes' }
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(mockAssignments.pending)
      ;(assignmentsService.updateAssignment as jest.Mock).mockResolvedValue(updatedAssignment)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { dueDate: '2024-06-20', notes: 'Updated notes', userId: '2' },
      })

      await updateAssignment(mockReq as Request, mockRes as Response)

      expect(assignmentsService.getAssignmentById).toHaveBeenCalledWith(1)
      expect(assignmentsService.updateAssignment).toHaveBeenCalledWith(1, {
        dueDate: expect.any(Date),
        notes: 'Updated notes',
        userId: '2',
      })
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment: updatedAssignment },
      })
    })

    it('should throw 400 for invalid assignment ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        updateAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if assignment not found', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
        body: { notes: 'Test' },
      })

      await expect(
        updateAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(mockAssignments.pending)
      ;(assignmentsService.updateAssignment as jest.Mock).mockRejectedValue(
        new Error('Update error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { notes: 'Updated' },
      })

      await expect(
        updateAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Update error')
    })
  })

  describe('completeAssignment', () => {
    const pendingWithTemplate = {
      ...mockAssignments.pending,
      userId: 2,
      choreTemplate: { ...mockTemplates.dishes, points: 10 },
    }

    it('should return 200 with completed assignment for parent', async () => {
      const completedAssignment = { ...pendingWithTemplate, status: 'COMPLETED' }
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(pendingWithTemplate)
      ;(assignmentsService.completeAssignment as jest.Mock).mockResolvedValue(completedAssignment)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { status: 'COMPLETED' },
      })

      await completeAssignment(mockReq as Request, mockRes as Response)

      expect(assignmentsService.completeAssignment).toHaveBeenCalledWith(1, 1, {
        status: 'COMPLETED',
        customPoints: undefined,
        isParent: true,
      })
      expect(notificationsService.createNotification).toHaveBeenCalled()
      expect(notificationSettingsService.sendPushNotification).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment: completedAssignment, pointsAwarded: 10 },
      })
    })

    it('should handle partially complete assignments', async () => {
      const completedAssignment = { ...pendingWithTemplate, status: 'PARTIALLY_COMPLETE' }
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(pendingWithTemplate)
      ;(assignmentsService.completeAssignment as jest.Mock).mockResolvedValue(completedAssignment)

      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        params: { id: '1' },
        body: { status: 'PARTIALLY_COMPLETE' },
      })

      await completeAssignment(mockReq as Request, mockRes as Response)

      expect(assignmentsService.completeAssignment).toHaveBeenCalledWith(1, 2, {
        status: 'PARTIALLY_COMPLETE',
        customPoints: undefined,
        isParent: false,
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment: completedAssignment, pointsAwarded: 5 },
      })
    })

    it('should use customPoints when provided', async () => {
      const completedAssignment = { ...pendingWithTemplate, status: 'COMPLETED' }
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(pendingWithTemplate)
      ;(assignmentsService.completeAssignment as jest.Mock).mockResolvedValue(completedAssignment)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { customPoints: 8 },
      })

      await completeAssignment(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment: completedAssignment, pointsAwarded: 8 },
      })
    })

    it('should throw 400 for invalid assignment ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        completeAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if assignment not found', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        completeAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(pendingWithTemplate)
      ;(assignmentsService.completeAssignment as jest.Mock).mockRejectedValue(
        new Error('Complete error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await expect(
        completeAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Complete error')
    })
  })

  describe('deleteAssignment', () => {
    it('should return 200 with success message on deletion', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(mockAssignments.pending)
      ;(assignmentsService.deleteAssignment as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await deleteAssignment(mockReq as Request, mockRes as Response)

      expect(assignmentsService.deleteAssignment).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Assignment deleted successfully' },
      })
    })

    it('should throw 400 for invalid assignment ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        deleteAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if assignment not found', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        deleteAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(assignmentsService.getAssignmentById as jest.Mock).mockResolvedValue(mockAssignments.pending)
      ;(assignmentsService.deleteAssignment as jest.Mock).mockRejectedValue(
        new Error('Delete error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        deleteAssignment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Delete error')
    })
  })
})
