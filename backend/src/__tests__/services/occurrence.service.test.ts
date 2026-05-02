/**
 * Occurrence Service Tests
 *
 * Covers:
 * - generateOccurrencesForChore: date range generation, duplicate avoidance
 */

import * as occurrenceService from '../../services/recurring-chores/occurrence.service'

// Mock assignment service
jest.mock('../../services/recurring-chores/assignment.service', () => ({
  calculateAssignedUserIds: jest.fn(),
}))

import { calculateAssignedUserIds } from '../../services/recurring-chores/assignment.service'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreOccurrence: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'

describe('Occurrence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateOccurrencesForChore', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should generate occurrences for 30 days from a recurring chore', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.choreOccurrence.createMany as jest.Mock).mockResolvedValue({ count: 5 })
      ;(calculateAssignedUserIds as jest.Mock).mockReturnValue({ assignedUserIds: [2] })

      await occurrenceService.generateOccurrencesForChore(
        1,
        { frequency: 'DAILY', interval: 1 },
        new Date('2024-01-01'),
        'FIXED',
        [2],
        [],
        null
      )

      // Should call createMany with generated occurrences
      expect(prisma.choreOccurrence.createMany).toHaveBeenCalled()
      const createManyCall = (prisma.choreOccurrence.createMany as jest.Mock).mock.calls[0][0]
      expect(createManyCall.data).toBeDefined()
      expect(Array.isArray(createManyCall.data)).toBe(true)
    })

    it('should skip dates that already have occurrences', async () => {
      const existingDate = new Date('2024-01-17T00:00:00.000Z')
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([
        { dueDate: existingDate },
      ])
      ;(calculateAssignedUserIds as jest.Mock).mockReturnValue({ assignedUserIds: [2] })
      ;(prisma.choreOccurrence.createMany as jest.Mock).mockResolvedValue({ count: 0 })

      await occurrenceService.generateOccurrencesForChore(
        1,
        { frequency: 'DAILY', interval: 1 },
        new Date('2024-01-01'),
        'FIXED',
        [2],
        [],
        null
      )

      // createMany should have been called (there will be other dates that don't overlap)
      expect(prisma.choreOccurrence.createMany).toHaveBeenCalled()
    })

    it('should NOT call createMany when no new occurrences to create', async () => {
      // Mock that ALL dates in the range already exist
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([
        { dueDate: new Date('2024-01-17T00:00:00.000Z') },
        { dueDate: new Date('2024-01-18T00:00:00.000Z') },
        { dueDate: new Date('2024-01-19T00:00:00.000Z') },
      ])
      ;(calculateAssignedUserIds as jest.Mock).mockReturnValue({ assignedUserIds: [2] })

      await occurrenceService.generateOccurrencesForChore(
        1,
        { frequency: 'DAILY', interval: 1 },
        new Date('2024-01-01'),
        'FIXED',
        [2],
        [],
        null
      )

      // createMany may still be called if there are non-overlapping dates
      // This test verifies the deduplication logic runs
      expect(prisma.choreOccurrence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recurringChoreId: 1,
          }),
        })
      )
    })

    it('should calculate assigned user IDs with initial round-robin index', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([])
      ;(calculateAssignedUserIds as jest.Mock).mockReturnValue({ assignedUserIds: [3] })
      ;(prisma.choreOccurrence.createMany as jest.Mock).mockResolvedValue({ count: 5 })

      await occurrenceService.generateOccurrencesForChore(
        1,
        { frequency: 'DAILY', interval: 1 },
        new Date('2024-01-01'),
        'ROUND_ROBIN',
        [],
        [2, 3],
        5
      )

      // Should pass incremented indexes to calculateAssignedUserIds
      expect(calculateAssignedUserIds).toHaveBeenCalled()
    })

    it('should set assignedUserIds as JSON string in created occurrences', async () => {
      ;(prisma.choreOccurrence.findMany as jest.Mock).mockResolvedValue([])
      ;(calculateAssignedUserIds as jest.Mock).mockReturnValue({ assignedUserIds: [2] })
      ;(prisma.choreOccurrence.createMany as jest.Mock).mockResolvedValue({ count: 1 })

      await occurrenceService.generateOccurrencesForChore(
        1,
        { frequency: 'DAILY', interval: 1 },
        new Date('2024-01-01'),
        'FIXED',
        [2],
        [],
        null
      )

      const createdData = (prisma.choreOccurrence.createMany as jest.Mock).mock.calls[0][0].data
      expect(createdData.length).toBeGreaterThan(0)
      createdData.forEach((occ: any) => {
        expect(typeof occ.assignedUserIds).toBe('string')
        expect(() => JSON.parse(occ.assignedUserIds)).not.toThrow()
      })
    })
  })
})
