/**
 * Overdue Penalty Service Tests
 */

import * as overdueService from '../../services/overdue-penalty.service'
import * as notificationsService from '../../services/notifications.service'
import { mockNotificationSettings } from '../test-helpers'

// Mock notifications service
jest.mock('../../services/notifications.service.js', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 }),
}))

// Mock notification-settings service
jest.mock('../../services/notification-settings.service.js', () => ({
  getOrCreateSettings: jest.fn(),
  sendPushNotification: jest.fn().mockResolvedValue(true),
}))

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    choreAssignment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}))

import { getOrCreateSettings } from '../../services/notification-settings.service'

describe('Overdue Penalty Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
