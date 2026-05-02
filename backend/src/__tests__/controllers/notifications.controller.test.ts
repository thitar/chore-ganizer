import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/notifications.service', () => ({
  getUserNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  createOverdueNotifications: jest.fn(),
}))

import * as notificationsService from '../../services/notifications.service'
import { getNotifications, markAsRead, markAllAsRead, checkOverdue } from '../../controllers/notifications.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Notifications Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getNotifications', () => {
    it('should return 200 with notifications on success', async () => {
      const mockNotifications = [
        { id: 1, type: 'CHORE_ASSIGNED', title: 'New Chore' },
      ]
      ;(notificationsService.getUserNotifications as jest.Mock).mockResolvedValue(mockNotifications)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        query: { unread: 'true' },
      })

      await getNotifications(mockReq as Request, mockRes as Response)

      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(1, true)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { notifications: mockNotifications },
      })
    })

    it('should pass unread=false when query param is not true', async () => {
      ;(notificationsService.getUserNotifications as jest.Mock).mockResolvedValue([])

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getNotifications(mockReq as Request, mockRes as Response)

      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(1, false)
    })

    it('should propagate service errors', async () => {
      ;(notificationsService.getUserNotifications as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        getNotifications(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('markAsRead', () => {
    it('should return 200 with updated notification on success', async () => {
      const mockNotification = { id: 1, readAt: new Date() }
      ;(notificationsService.markNotificationAsRead as jest.Mock).mockResolvedValue(mockNotification)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await markAsRead(mockReq as Request, mockRes as Response)

      expect(notificationsService.markNotificationAsRead).toHaveBeenCalledWith(1, 1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { notification: mockNotification },
      })
    })

    it('should throw 400 for invalid notification ID', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: 'invalid' },
      })

      await expect(
        markAsRead(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(notificationsService.markNotificationAsRead as jest.Mock).mockRejectedValue(
        new Error('Not found')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await expect(
        markAsRead(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Not found')
    })
  })

  describe('markAllAsRead', () => {
    it('should return 200 with count on success', async () => {
      ;(notificationsService.markAllAsRead as jest.Mock).mockResolvedValue(5)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await markAllAsRead(mockReq as Request, mockRes as Response)

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'All notifications marked as read', count: 5 },
      })
    })

    it('should propagate service errors', async () => {
      ;(notificationsService.markAllAsRead as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        markAllAsRead(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('checkOverdue', () => {
    it('should return 200 with count on success', async () => {
      ;(notificationsService.createOverdueNotifications as jest.Mock).mockResolvedValue(3)

      await checkOverdue(mockReq as Request, mockRes as Response)

      expect(notificationsService.createOverdueNotifications).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Created 3 overdue notifications', count: 3 },
      })
    })

    it('should propagate service errors', async () => {
      ;(notificationsService.createOverdueNotifications as jest.Mock).mockRejectedValue(
        new Error('Processing error')
      )

      await expect(
        checkOverdue(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Processing error')
    })
  })
})
