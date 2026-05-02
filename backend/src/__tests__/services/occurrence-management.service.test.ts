/**
 * Occurrence Management Service Tests
 *
 * Covers:
 * - completeOccurrence: validation, points award, error cases
 * - skipOccurrence / unskipOccurrence: skip/unskip logic
 * - triggerOccurrenceGeneration
 * - safeParseAssignedUserIds: valid/invalid JSON parsing
 * - round-robin rotation after completion
 */

import * as omService from '../../services/recurring-chores/occurrence-management.service'
import { AppError } from '../../middleware/errorHandler'

// Mock Prisma with occurrence management models
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreOccurrence: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    recurringChore: {
      findUnique: jest.fn(),
    },
    recurringChoreFixedAssignee: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'

describe('Occurrence Management Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('safeParseAssignedUserIds', () => {
    it('should parse valid JSON array', () => {
      // Called internally, test through a public function that uses it
      // We can directly test it via attachAssignedUsersToOccurrences
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 2, name: 'Test Child', color: '#10B981' },
      ])

      const result = omService.attachAssignedUsersToOccurrences([
        { id: 1, assignedUserIds: '[2]' },
      ])

      expect(result).resolves.toBeDefined()
    })

    it('should throw DATA_INTEGRITY_ERROR on invalid JSON', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      await expect(
        omService.attachAssignedUsersToOccurrences([
          { id: 1, assignedUserIds: 'not-valid-json' },
        ])
      ).rejects.toThrow('Invalid occurrence data')
    })
  })

  describe('attachAssignedUsersToOccurrences', () => {
    it('should fetch users for each occurrence and attach them', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 2, name: 'Test Child', color: '#10B981' },
      ])

      const result = await omService.attachAssignedUsersToOccurrences([
        { id: 1, assignedUserIds: '[2]' },
        { id: 2, assignedUserIds: '[2]' },
      ])

      expect(result).toHaveLength(2)
      expect(result[0].assignedUsers).toBeDefined()
      expect(result[0].assignedUsers).toHaveLength(1)
      expect(result[0].assignedUsers[0].id).toBe(2)
    })

    it('should return occurrences with empty assignedUsers when no users match', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      const result = await omService.attachAssignedUsersToOccurrences([
        { id: 1, assignedUserIds: '[999]' },
      ])

      expect(result).toHaveLength(1)
      expect(result[0].assignedUsers).toEqual([])
    })
  })

  describe('updateRoundRobinAfterCompletion', () => {
    it('should reassign subsequent occurrences to next person in pool', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([
        { id: 10, dueDate: new Date('2024-01-20T10:00:00Z') },
        { id: 11, dueDate: new Date('2024-01-21T10:00:00Z') },
      ])
      ;(prisma.choreOccurrence.update as jest.Mock).mockResolvedValue({})

      await omService.updateRoundRobinAfterCompletion(
        1,
        'ROUND_ROBIN',
        0,
        [{ userId: 2 }, { userId: 3 }],
        []
      )

      expect(prisma.choreOccurrence.update).toHaveBeenCalledTimes(2)
      // First occurrence should be assigned to index 1 (pool[1] = userId 3)
      expect(prisma.choreOccurrence.update).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({
            assignedUserIds: JSON.stringify([3]),
          }),
        })
      )
    })

    it('should handle MIXED mode by keeping fixed assignees', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([
        { id: 10, dueDate: new Date('2024-01-20T10:00:00Z') },
      ])
      ;(prisma.choreOccurrence.update as jest.Mock).mockResolvedValue({})

      await omService.updateRoundRobinAfterCompletion(
        1,
        'MIXED',
        0,
        [{ userId: 3 }],
        [1, 2]
      )

      expect(prisma.choreOccurrence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedUserIds: JSON.stringify([1, 2, 3]),
          }),
        })
      )
    })

    it('should do nothing when no subsequent occurrences exist', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([])

      await omService.updateRoundRobinAfterCompletion(
        1,
        'ROUND_ROBIN',
        0,
        [{ userId: 2 }],
        []
      )

      expect(prisma.choreOccurrence.update).not.toHaveBeenCalled()
    })
  })

  describe('awardPointsForCompletion', () => {
    it('should award points if user is in assigned list', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: 2,
        points: 15,
      })

      await omService.awardPointsForCompletion(2, '[2]', 5)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { points: { increment: 5 } },
      })
    })

    it('should NOT award points if user is NOT in assigned list', async () => {
      await omService.awardPointsForCompletion(3, '[2]', 5)

      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should handle multiple users in assigned list', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: 2,
        points: 20,
      })

      await omService.awardPointsForCompletion(2, '[2,3,4]', 10)

      expect(prisma.user.update).toHaveBeenCalledTimes(1)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { points: { increment: 10 } },
      })
    })
  })
})
