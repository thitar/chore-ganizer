/**
 * Notifications Service Tests
 * 
 * Unit tests for the notifications service.
 */

import * as notificationsService from '../../services/notifications.service'
import prisma from '../../config/database'

// Mock Prisma - use jest.fn() for proper mocking
jest.mock('../../config/database', () => {
  const mockFn = jest.fn()
  return {
    __esModule: true,
    default: {
      notification: {
        create: mockFn,
        findMany: mockFn,
        findUnique: mockFn,
        update: mockFn,
      },
    },
  }
})

describe('Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createNotification', () => {
    const notificationData = {
      userId: 1,
      type: 'CHORE_ASSIGNED',
      title: 'New Chore Assigned',
      message: 'You have been assigned a new chore',
    }

    it('should create a notification successfully', async () => {
      const mockNotification = {
        id: 1,
        ...notificationData,
        read: false,
        createdAt: new Date(),
      }
      ;(prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification)

      const result = await notificationsService.createNotification(notificationData)

      expect(result).toEqual(mockNotification)
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: notificationData,
      })
    })

    it('should create notification with all required fields', async () => {
      const data = {
        userId: 1,
        type: 'TEST',
        title: 'Test',
        message: 'Test message',
      }
      ;(prisma.notification.create as jest.Mock).mockResolvedValue({ 
        id: 1, 
        ...data, 
        read: false, 
        createdAt: new Date() 
      })

      await notificationsService.createNotification(data)

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data,
      })
    })
  })

  describe('getUserNotifications', () => {
    const mockNotifications = [
      {
        id: 1,
        userId: 1,
        type: 'CHORE_ASSIGNED',
        title: 'New Chore',
        message: 'Message 1',
        read: false,
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        type: 'CHORE_COMPLETED',
        title: 'Chore Done',
        message: 'Message 2',
        read: true,
        createdAt: new Date(),
      },
    ]

    it('should return all notifications for a user', async () => {
      ;(prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications)

      const result = await notificationsService.getUserNotifications(1)

      expect(result).toEqual(mockNotifications)
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return only unread notifications when unreadOnly is true', async () => {
      const unreadNotifications = [mockNotifications[0]]
      ;(prisma.notification.findMany as jest.Mock).mockResolvedValue(unreadNotifications)

      const result = await notificationsService.getUserNotifications(1, true)

      expect(result).toEqual(unreadNotifications)
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 1, read: false },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no notifications exist', async () => {
      ;(prisma.notification.findMany as jest.Mock).mockResolvedValue([])

      const result = await notificationsService.getUserNotifications(999)

      expect(result).toEqual([])
    })

    it('should order notifications by createdAt descending', async () => {
      ;(prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications)

      await notificationsService.getUserNotifications(1)

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'TEST',
        title: 'Test',
        message: 'Test message',
        read: true,
        createdAt: new Date(),
      }
      ;(prisma.notification.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 1, userId: 1 })
        .mockResolvedValueOnce(mockNotification)
      ;(prisma.notification.update as jest.Mock).mockResolvedValue(mockNotification)

      const result = await notificationsService.markNotificationAsRead(1, 1)

      expect(result.read).toBe(true)
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { read: true },
      })
    })

    it('should throw error if notification not found', async () => {
      ;(prisma.notification.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        notificationsService.markNotificationAsRead(999, 1)
      ).rejects.toThrow('Notification not found')
    })

    it('should throw error if notification does not belong to user', async () => {
      ;(prisma.notification.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2, // Different user
      })

      await expect(
        notificationsService.markNotificationAsRead(1, 1)
      ).rejects.toThrow('Notification does not belong to user')
    })
  })
})
