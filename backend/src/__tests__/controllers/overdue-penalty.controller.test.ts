import { createMockRequest, createMockResponse, mockNotificationSettings } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/overdue-penalty.service', () => ({
  getFamilyPenaltySettings: jest.fn(),
  updatePenaltySettings: jest.fn(),
  processOverdueChores: jest.fn(),
  calculateDaysOverdue: jest.fn(),
}))

jest.mock('../../services/notification-settings.service', () => ({
  updateSettings: jest.fn(),
}))

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreAssignment: {
      findMany: jest.fn(),
    },
  },
}))

import * as overduePenaltyService from '../../services/overdue-penalty.service'
import * as notificationSettingsService from '../../services/notification-settings.service'
import prisma from '../../config/database'
import {
  getPenaltySettings, updatePenaltySettings, processOverdue,
  getOverdueChores, getPenaltyHistory,
} from '../../controllers/overdue-penalty.controller'

describe('Overdue Penalty Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getPenaltySettings', () => {
    const mockSettings = {
      overduePenaltyEnabled: true,
      overduePenaltyMultiplier: 2,
      notifyParentOnOverdue: true,
    }

    it('should return 200 with settings on success', async () => {
      ;(overduePenaltyService.getFamilyPenaltySettings as jest.Mock).mockResolvedValue(mockSettings)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getPenaltySettings(mockReq as Request, mockRes as Response)

      expect(overduePenaltyService.getFamilyPenaltySettings).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockSettings })
    })

    it('should return 401 if not authenticated', async () => {
      await getPenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should return 403 if user is not PARENT', async () => {
      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
      })

      await getPenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should return 404 if no settings found', async () => {
      ;(overduePenaltyService.getFamilyPenaltySettings as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getPenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('should return 500 on service error', async () => {
      ;(overduePenaltyService.getFamilyPenaltySettings as jest.Mock).mockRejectedValue(
        new Error('Service error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getPenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })

  describe('updatePenaltySettings', () => {
    it('should return 200 with updated settings on success', async () => {
      const updatedSettings = {
        ...mockNotificationSettings.default,
        overduePenaltyEnabled: false,
        overduePenaltyMultiplier: 5,
        notifyParentOnOverdue: false,
      }
      ;(notificationSettingsService.updateSettings as jest.Mock).mockResolvedValue(updatedSettings)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: {
          overduePenaltyEnabled: false,
          overduePenaltyMultiplier: '5',
          notifyParentOnOverdue: false,
        },
      })

      await updatePenaltySettings(mockReq as Request, mockRes as Response)

      expect(notificationSettingsService.updateSettings).toHaveBeenCalledWith(1, {
        overduePenaltyEnabled: false,
        overduePenaltyMultiplier: 5,
        notifyParentOnOverdue: false,
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overduePenaltyEnabled: updatedSettings.overduePenaltyEnabled,
          overduePenaltyMultiplier: updatedSettings.overduePenaltyMultiplier,
          notifyParentOnOverdue: updatedSettings.notifyParentOnOverdue,
        },
      })
    })

    it('should return 401 if not authenticated', async () => {
      await updatePenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should return 403 if user is not PARENT', async () => {
      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
      })

      await updatePenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should return 400 for invalid multiplier', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { overduePenaltyMultiplier: 15 },
      })

      await updatePenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 500 on service error', async () => {
      ;(notificationSettingsService.updateSettings as jest.Mock).mockRejectedValue(
        new Error('Update error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { overduePenaltyEnabled: true },
      })

      await updatePenaltySettings(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })

  describe('processOverdue', () => {
    it('should return 200 with result on success', async () => {
      ;(overduePenaltyService.processOverdueChores as jest.Mock).mockResolvedValue({
        processed: 5,
        errors: 0,
        details: [],
      })

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await processOverdue(mockReq as Request, mockRes as Response)

      expect(overduePenaltyService.processOverdueChores).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Processed 5 overdue chores',
          processed: 5,
          errors: 0,
          details: [],
        },
      })
    })

    it('should return 401 if not authenticated', async () => {
      await processOverdue(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should return 403 if user is not PARENT', async () => {
      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
      })

      await processOverdue(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should return 500 on service error', async () => {
      ;(overduePenaltyService.processOverdueChores as jest.Mock).mockRejectedValue(
        new Error('Process error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await processOverdue(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getOverdueChores', () => {
    it('should return 200 with overdue chores for parent', async () => {
      const mockChores = [
        { id: 1, dueDate: new Date(), choreTemplate: { title: 'Test' }, assignedTo: { id: 2, name: 'Child', color: '#000' } },
      ]
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockChores)
      ;(overduePenaltyService.calculateDaysOverdue as jest.Mock).mockReturnValue(3)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getOverdueChores(mockReq as Request, mockRes as Response)

      expect(prisma.choreAssignment.findMany).toHaveBeenCalled()
      expect(overduePenaltyService.calculateDaysOverdue).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1, daysOverdue: 3 }),
        ]),
      })
    })

    it('should return 200 with filtered overdue chores for child', async () => {
      const mockChores = [
        { id: 3, dueDate: new Date(), choreTemplate: { title: 'Test' }, assignedTo: { id: 2, name: 'Child', color: '#000' } },
      ]
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockChores)
      ;(overduePenaltyService.calculateDaysOverdue as jest.Mock).mockReturnValue(1)

      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
      })

      await getOverdueChores(mockReq as Request, mockRes as Response)

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 2,
          }),
        })
      )
    })

    it('should return 401 if not authenticated', async () => {
      await getOverdueChores(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should return 500 on service error', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getOverdueChores(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getPenaltyHistory', () => {
    it('should return 200 with penalty history for parent', async () => {
      const mockPenalties = [
        { id: 1, penaltyApplied: true, penaltyPoints: -10, choreTemplate: { title: 'Test' }, assignedTo: { id: 2, name: 'Child', color: '#000' } },
      ]
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockPenalties)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getPenaltyHistory(mockReq as Request, mockRes as Response)

      expect(prisma.choreAssignment.findMany).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPenalties,
      })
    })

    it('should filter penalty history for child', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
      })

      await getPenaltyHistory(mockReq as Request, mockRes as Response)

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 2,
          }),
        })
      )
    })

    it('should return 401 if not authenticated', async () => {
      await getPenaltyHistory(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should return 500 on service error', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getPenaltyHistory(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })
})
