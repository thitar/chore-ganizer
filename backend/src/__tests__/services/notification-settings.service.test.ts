/**
 * Tests for Notification Settings Service
 * 
 * Tests cover:
 * - getOrCreateSettings: Get or create user settings
 * - updateSettings: Update user settings
 * - getDefaultSettings: Get default settings from env
 */

import * as notificationSettingsService from '../../services/notification-settings.service'
import prisma from '../../config/database'
import { mockNotificationSettings } from '../test-helpers'

// Mock ntfy service
jest.mock('../../services/ntfy.service.js', () => ({
  sendNtfyNotification: jest.fn().mockResolvedValue(true),
  NotificationPriorities: {
    HIGH: 'high',
    DEFAULT: 'default',
    LOW: 'low',
    CHORE_OVERDUE: 5,
    POINTS_EARNED: 3,
    CHORE_ASSIGNED: 3,
    CHORE_DUE_SOON: 4,
    CHORE_COMPLETED: 3,
    PENALTY: 5,
  },
  NotificationTags: {
    WARNING: 'warning',
    INFO: 'info',
    CHORE_OVERDUE: ['x', 'warning'],
    POINTS_EARNED: ['white_check_mark'],
    CHORE_ASSIGNED: ['white_check_mark'],
    CHORE_DUE_SOON: ['alarm_clock'],
    CHORE_COMPLETED: ['white_check_mark'],
    PENALTY: ['warning', 'x'],
  },
}))

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    userNotificationSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

describe('Notification Settings Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateSettings', () => {
    it('should return existing settings if found', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(
        mockNotificationSettings.default
      )

      const result = await notificationSettingsService.getOrCreateSettings(1)

      expect(result).toEqual(mockNotificationSettings.default)
      expect(prisma.userNotificationSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
      })
      expect(prisma.userNotificationSettings.create).not.toHaveBeenCalled()
    })

    it('should create default settings if not found', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.userNotificationSettings.create as jest.Mock).mockResolvedValue(
        mockNotificationSettings.default
      )

      const result = await notificationSettingsService.getOrCreateSettings(1)

      expect(result).toBeDefined()
      expect(prisma.userNotificationSettings.create).toHaveBeenCalled()
    })
  })

  describe('updateSettings', () => {
    it('should update ntfy topic', async () => {
      // Mock findUnique to return existing settings
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(mockNotificationSettings.default)
      // Mock update to return updated settings
      ;(prisma.userNotificationSettings.update as jest.Mock).mockImplementation(async ({ data }: { data: any }) => ({
        ...mockNotificationSettings.default,
        ...data,
      }))

      const result = await notificationSettingsService.updateSettings(1, {
        ntfyTopic: 'my-family-chores',
      })

      expect(result.ntfyTopic).toBe('my-family-chores')
    })

    it('should update notification toggles', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(mockNotificationSettings.default)
      ;(prisma.userNotificationSettings.update as jest.Mock).mockImplementation(async ({ data }: { data: any }) => ({
        ...mockNotificationSettings.default,
        ...data,
      }))

      const result = await notificationSettingsService.updateSettings(1, {
        notifyChoreAssigned: false,
        notifyChoreDueSoon: false,
      })

      expect(result.notifyChoreAssigned).toBe(false)
      expect(result.notifyChoreDueSoon).toBe(false)
    })

    it('should update reminder hours', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(mockNotificationSettings.default)
      ;(prisma.userNotificationSettings.update as jest.Mock).mockImplementation(async ({ data }: { data: any }) => ({
        ...mockNotificationSettings.default,
        ...data,
      }))

      const result = await notificationSettingsService.updateSettings(1, {
        reminderHoursBefore: 4,
      })

      expect(result.reminderHoursBefore).toBe(4)
    })

    it('should update quiet hours', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(mockNotificationSettings.default)
      ;(prisma.userNotificationSettings.update as jest.Mock).mockImplementation(async ({ data }: { data: any }) => ({
        ...mockNotificationSettings.default,
        ...data,
      }))

      const result = await notificationSettingsService.updateSettings(1, {
        quietHoursStart: 22,
        quietHoursEnd: 7,
      })

      expect(result.quietHoursStart).toBe(22)
      expect(result.quietHoursEnd).toBe(7)
    })

    it('should update overdue penalty settings', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(mockNotificationSettings.default)
      ;(prisma.userNotificationSettings.update as jest.Mock).mockImplementation(async ({ data }: { data: any }) => ({
        ...mockNotificationSettings.default,
        ...data,
      }))

      const result = await notificationSettingsService.updateSettings(1, {
        overduePenaltyEnabled: false,
        overduePenaltyMultiplier: 3,
      })

      expect(result.overduePenaltyEnabled).toBe(false)
      expect(result.overduePenaltyMultiplier).toBe(3)
    })
  })

  describe('getDefaultSettings', () => {
    it('should return default settings from environment', () => {
      const defaults = notificationSettingsService.getDefaultSettings()

      expect(defaults).toHaveProperty('ntfyServerUrl')
      expect(defaults).toHaveProperty('notifyChoreAssigned')
      expect(defaults).toHaveProperty('reminderHoursBefore')
      expect(defaults).toHaveProperty('overduePenaltyEnabled')
    })
  })

  describe('sendPushNotification', () => {
    const settingsWithNtfy = {
      ...mockNotificationSettings.default,
      ntfyTopic: 'test-topic',
      ntfyServerUrl: 'https://ntfy.sh',
      notifyChoreOverdue: true,
    }

    beforeEach(() => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(settingsWithNtfy)
    })

    it('should include assignee name in CHORE_OVERDUE message when userName is provided', async () => {
      const { sendNtfyNotification } = require('../../services/ntfy.service')

      await notificationSettingsService.sendPushNotification(1, 'CHORE_OVERDUE', {
        choreTitle: 'Wash Dishes',
        daysOverdue: 3,
        userName: 'Alice',
      })

      expect(sendNtfyNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Overdue: Wash Dishes',
          message: '"Wash Dishes" assigned to Alice is 3 day(s) overdue',
        })
      )
    })

    it('should omit assignee name in CHORE_OVERDUE message when userName is not provided', async () => {
      const { sendNtfyNotification } = require('../../services/ntfy.service')

      await notificationSettingsService.sendPushNotification(1, 'CHORE_OVERDUE', {
        choreTitle: 'Wash Dishes',
        daysOverdue: 3,
      })

      expect(sendNtfyNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '"Wash Dishes" is 3 day(s) overdue',
        })
      )
    })

    it('should return false when user has no ntfyTopic configured', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue({
        ...mockNotificationSettings.default,
        ntfyTopic: null,
        notifyChoreOverdue: true,
      })

      const result = await notificationSettingsService.sendPushNotification(1, 'CHORE_OVERDUE', {
        choreTitle: 'Wash Dishes',
      })

      expect(result).toBe(false)
    })

    it('should return false when notification type is not enabled', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue({
        ...settingsWithNtfy,
        notifyChoreOverdue: false,
      })

      const result = await notificationSettingsService.sendPushNotification(1, 'CHORE_OVERDUE', {
        choreTitle: 'Wash Dishes',
      })

      expect(result).toBe(false)
    })

    it('should return false during quiet hours', async () => {
      // Set system time to be within quiet hours
      jest.useFakeTimers()
      const quietHour = 22 // 10 PM
      const now = new Date()
      now.setHours(quietHour, 0, 0, 0)
      jest.setSystemTime(now)

      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue({
        ...settingsWithNtfy,
        quietHoursStart: 22,
        quietHoursEnd: 7,
      })

      const result = await notificationSettingsService.sendPushNotification(1, 'CHORE_OVERDUE', {
        choreTitle: 'Wash Dishes',
      })

      expect(result).toBe(false)
      jest.useRealTimers()
    })

    it('should handle CHORE_ASSIGNED type correctly', async () => {
      const { sendNtfyNotification } = require('../../services/ntfy.service')

      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue({
        ...settingsWithNtfy,
        notifyChoreAssigned: true,
      })

      await notificationSettingsService.sendPushNotification(1, 'CHORE_ASSIGNED', {
        choreTitle: 'Wash Dishes',
        dueDate: '2024-01-20',
      })

      expect(sendNtfyNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Chore Assigned: Wash Dishes',
        })
      )
    })

    it('should handle POINTS_EARNED type correctly', async () => {
      const { sendNtfyNotification } = require('../../services/ntfy.service')

      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue({
        ...settingsWithNtfy,
        notifyPointsEarned: true,
      })

      await notificationSettingsService.sendPushNotification(1, 'POINTS_EARNED', {
        choreTitle: 'Wash Dishes',
        points: 10,
        totalPoints: 50,
      })

      expect(sendNtfyNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'You earned 10 points!',
        })
      )
    })
  })

  describe('updateSettings additional validation', () => {
    it('should throw error for invalid ntfyServerUrl (SSRF prevention)', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock).mockResolvedValue(mockNotificationSettings.default)

      await expect(
        notificationSettingsService.updateSettings(1, {
          ntfyServerUrl: 'http://internal.server/admin',
        })
      ).rejects.toThrow()
    })

    it('should create settings with defaults when none exist during update', async () => {
      ;(prisma.userNotificationSettings.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // no existing
      ;(prisma.userNotificationSettings.create as jest.Mock).mockResolvedValue({
        ...mockNotificationSettings.default,
        ntfyTopic: 'my-topic',
      })

      const result = await notificationSettingsService.updateSettings(1, {
        ntfyTopic: 'my-topic',
      })

      expect(result.ntfyTopic).toBe('my-topic')
      expect(prisma.userNotificationSettings.create).toHaveBeenCalled()
    })
  })
})
