import { createMockRequest, createMockResponse, mockNotificationSettings } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/notification-settings.service', () => ({
  getOrCreateSettings: jest.fn(),
  getDefaultSettings: jest.fn(),
  updateSettings: jest.fn(),
  sendTestNotification: jest.fn(),
}))

import * as notificationSettingsService from '../../services/notification-settings.service'
import { getSettings, getDefaults, updateSettings, sendTestNotification } from '../../controllers/notification-settings.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Notification Settings Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getSettings', () => {
    it('should return 200 with settings on success', async () => {
      ;(notificationSettingsService.getOrCreateSettings as jest.Mock).mockResolvedValue(
        mockNotificationSettings.default
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getSettings(mockReq as Request, mockRes as Response)

      expect(notificationSettingsService.getOrCreateSettings).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { settings: mockNotificationSettings.default },
      })
    })

    it('should propagate service errors', async () => {
      ;(notificationSettingsService.getOrCreateSettings as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        getSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('getDefaults', () => {
    it('should return 200 with default settings on success', async () => {
      const mockDefaults = { notifyChoreAssigned: true, notifyChoreDueSoon: true }
      ;(notificationSettingsService.getDefaultSettings as jest.Mock).mockReturnValue(mockDefaults)

      await getDefaults(mockReq as Request, mockRes as Response)

      expect(notificationSettingsService.getDefaultSettings).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { defaults: mockDefaults },
      })
    })
  })

  describe('updateSettings', () => {
    it('should return 200 with updated settings on success', async () => {
      const updatedSettings = {
        ...mockNotificationSettings.default,
        notifyChoreAssigned: false,
      }
      ;(notificationSettingsService.updateSettings as jest.Mock).mockResolvedValue(updatedSettings)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: {
          notifyChoreAssigned: false,
          reminderHoursBefore: 4,
        },
      })

      await updateSettings(mockReq as Request, mockRes as Response)

      expect(notificationSettingsService.updateSettings).toHaveBeenCalledWith(1, {
        ntfyTopic: undefined,
        ntfyServerUrl: undefined,
        notifyChoreAssigned: false,
        notifyChoreDueSoon: undefined,
        notifyChoreCompleted: undefined,
        notifyChoreOverdue: undefined,
        notifyPointsEarned: undefined,
        reminderHoursBefore: 4,
        quietHoursStart: undefined,
        quietHoursEnd: undefined,
        overduePenaltyEnabled: undefined,
        overduePenaltyMultiplier: undefined,
        notifyParentOnOverdue: undefined,
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { settings: updatedSettings },
      })
    })

    it('should throw validation error for invalid quietHoursStart', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { quietHoursStart: 25 },
      })

      await expect(
        updateSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw validation error for invalid quietHoursEnd', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { quietHoursEnd: -1 },
      })

      await expect(
        updateSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw validation error for invalid reminderHoursBefore', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { reminderHoursBefore: 0 },
      })

      await expect(
        updateSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw validation error for invalid overduePenaltyMultiplier', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { overduePenaltyMultiplier: 15 },
      })

      await expect(
        updateSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should parse string overduePenaltyMultiplier to integer', async () => {
      ;(notificationSettingsService.updateSettings as jest.Mock).mockResolvedValue(
        mockNotificationSettings.default
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { overduePenaltyMultiplier: '3' },
      })

      await updateSettings(mockReq as Request, mockRes as Response)

      expect(notificationSettingsService.updateSettings).toHaveBeenCalledWith(1, expect.objectContaining({
        overduePenaltyMultiplier: 3,
      }))
    })

    it('should propagate service errors', async () => {
      ;(notificationSettingsService.updateSettings as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { notifyChoreAssigned: true },
      })

      await expect(
        updateSettings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Update failed')
    })
  })

  describe('sendTestNotification', () => {
    it('should return 200 with success message when test succeeds', async () => {
      ;(notificationSettingsService.sendTestNotification as jest.Mock).mockResolvedValue(true)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await sendTestNotification(mockReq as Request, mockRes as Response)

      expect(notificationSettingsService.sendTestNotification).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test notification sent successfully',
      })
    })

    it('should throw error when test fails', async () => {
      ;(notificationSettingsService.sendTestNotification as jest.Mock).mockResolvedValue(false)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        sendTestNotification(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(notificationSettingsService.sendTestNotification as jest.Mock).mockRejectedValue(
        new Error('Service error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        sendTestNotification(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error')
    })
  })
})
