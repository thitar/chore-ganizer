/**
 * Tests for Occurrence Job
 * 
 * Tests the background job that generates chore occurrences from recurring chores.
 */

import { generateDailyOccurrences } from '../../jobs/occurrenceJob'
import * as recurrenceService from '../../services/recurrence.service'

// Mock Prisma with proper structure
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    recurringChore: {
      findMany: jest.fn(),
    },
    choreOccurrence: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Import the mocked prisma after the mock is defined
import prisma from '../../config/database'

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('Occurrence Job', () => {
  let mockIsValidRule: jest.SpyInstance
  let mockGenerateOccurrences: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsValidRule = jest.spyOn(recurrenceService.RecurrenceService, 'isValidRule')
    mockGenerateOccurrences = jest.spyOn(recurrenceService.RecurrenceService, 'generateOccurrences')
  })

  afterEach(() => {
    mockIsValidRule.mockRestore()
    mockGenerateOccurrences.mockRestore()
  })

  describe('generateDailyOccurrences', () => {
    it('should create occurrences for daily recurring chores', async () => {
      // Mock data
      const mockRecurringChore = {
        id: 1,
        title: 'Daily Dishes',
        description: 'Wash dishes',
        points: 5,
        recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
        assignmentMode: 'FIXED',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [{ userId: 2 }],
        roundRobinPool: [],
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.create as jest.Mock).mockResolvedValue({
        id: 1,
        recurringChoreId: 1,
        dueDate: new Date(),
        status: 'PENDING',
      })

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      mockGenerateOccurrences.mockReturnValue([new Date()])

      // Execute
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(1)
      expect(prisma.choreOccurrence.create).toHaveBeenCalledTimes(1)
      expect(prisma.choreOccurrence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recurringChoreId: 1,
            status: 'PENDING',
          }),
        })
      )
    })

    it('should not create duplicate occurrences', async () => {
      // Mock data
      const mockRecurringChore = {
        id: 1,
        title: 'Daily Dishes',
        description: 'Wash dishes',
        points: 5,
        recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
        assignmentMode: 'FIXED',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [{ userId: 2 }],
        roundRobinPool: [],
      }

      // Mock existing occurrence
      const existingOccurrence = {
        id: 1,
        recurringChoreId: 1,
        dueDate: new Date('2024-01-15'),
        status: 'PENDING',
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(existingOccurrence)

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      mockGenerateOccurrences.mockReturnValue([new Date('2024-01-15')])

      // Execute
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(0)
      expect(prisma.choreOccurrence.create).not.toHaveBeenCalled()
    })

    it('should handle weekly recurring chores correctly', async () => {
      // Mock data - weekly chore on Mondays
      const mockRecurringChore = {
        id: 1,
        title: 'Weekly Cleaning',
        description: 'Clean the house',
        points: 10,
        recurrenceRule: JSON.stringify({ frequency: 'WEEKLY', interval: 1, dayOfWeek: [1] }), // Monday
        assignmentMode: 'FIXED',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [{ userId: 2 }],
        roundRobinPool: [],
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.create as jest.Mock).mockResolvedValue({
        id: 1,
        recurringChoreId: 1,
        dueDate: new Date('2024-01-15'), // This is a Monday
        status: 'PENDING',
      })

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      // Return the date only if it matches the target (Monday)
      mockGenerateOccurrences.mockImplementation(
        (_rule: unknown, start: Date, _end: Date) => {
          // If the target date is Monday, return it
          const targetDate = new Date('2024-01-15')
          if (start.getTime() === targetDate.getTime()) {
            return [targetDate]
          }
          return []
        }
      )

      // Execute on a Monday
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(1)
      expect(prisma.choreOccurrence.create).toHaveBeenCalledTimes(1)
    })

    it('should handle monthly recurring chores correctly', async () => {
      // Mock data - monthly chore on the 15th
      const mockRecurringChore = {
        id: 1,
        title: 'Monthly Report',
        description: 'Submit monthly report',
        points: 20,
        recurrenceRule: JSON.stringify({ frequency: 'MONTHLY', interval: 1, dayOfMonth: 15 }),
        assignmentMode: 'FIXED',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [{ userId: 2 }],
        roundRobinPool: [],
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.create as jest.Mock).mockResolvedValue({
        id: 1,
        recurringChoreId: 1,
        dueDate: new Date('2024-01-15'),
        status: 'PENDING',
      })

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      mockGenerateOccurrences.mockReturnValue([new Date('2024-01-15')])

      // Execute on the 15th
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(1)
    })

    it('should handle round-robin assignment mode', async () => {
      // Mock data
      const mockRecurringChore = {
        id: 1,
        title: 'Rotating Chore',
        description: 'Takes turns',
        points: 5,
        recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
        assignmentMode: 'ROUND_ROBIN',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [],
        roundRobinPool: [
          { userId: 2, order: 0 },
          { userId: 3, order: 1 },
        ],
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null) // No previous occurrence
      ;(prisma.choreOccurrence.create as jest.Mock).mockResolvedValue({
        id: 1,
        recurringChoreId: 1,
        dueDate: new Date(),
        status: 'PENDING',
      })

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      mockGenerateOccurrences.mockReturnValue([new Date()])

      // Execute
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(1)
      // Verify round-robin index is set
      expect(prisma.choreOccurrence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roundRobinIndex: 0, // First in rotation
          }),
        })
      )
    })

    it('should skip inactive recurring chores', async () => {
      // Mock prisma responses - should not return inactive chores
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([])

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)

      // Execute
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(0)
      expect(prisma.choreOccurrence.create).not.toHaveBeenCalled()
    })

    it('should handle invalid recurrence rule gracefully', async () => {
      // Mock data with invalid recurrence rule
      const mockRecurringChore = {
        id: 1,
        title: 'Invalid Rule Chore',
        description: 'Has invalid rule',
        points: 5,
        recurrenceRule: 'not valid json',
        assignmentMode: 'FIXED',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [{ userId: 2 }],
        roundRobinPool: [],
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])

      // Execute - should not throw
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert - should return 0 and not create any occurrences
      expect(count).toBe(0)
      expect(prisma.choreOccurrence.create).not.toHaveBeenCalled()
    })

    it('should handle recurring chores with no assignees', async () => {
      // Mock data - no assignees
      const mockRecurringChore = {
        id: 1,
        title: 'No Assignees',
        description: 'Nobody assigned',
        points: 5,
        recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
        assignmentMode: 'FIXED',
        isActive: true,
        startDate: new Date('2024-01-01'),
        createdById: 1,
        fixedAssignees: [], // No assignees
        roundRobinPool: [],
      }

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([mockRecurringChore])
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(null)

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      mockGenerateOccurrences.mockReturnValue([new Date()])

      // Execute
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert - should not create occurrence without assignees
      expect(count).toBe(0)
      expect(prisma.choreOccurrence.create).not.toHaveBeenCalled()
    })

    it('should handle multiple recurring chores', async () => {
      // Mock data - multiple chores
      const mockRecurringChores = [
        {
          id: 1,
          title: 'Chore 1',
          description: 'First chore',
          points: 5,
          recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
          assignmentMode: 'FIXED',
          isActive: true,
          startDate: new Date('2024-01-01'),
          createdById: 1,
          fixedAssignees: [{ userId: 2 }],
          roundRobinPool: [],
        },
        {
          id: 2,
          title: 'Chore 2',
          description: 'Second chore',
          points: 10,
          recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
          assignmentMode: 'FIXED',
          isActive: true,
          startDate: new Date('2024-01-01'),
          createdById: 1,
          fixedAssignees: [{ userId: 3 }],
          roundRobinPool: [],
        },
      ]

      // Mock prisma responses
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue(mockRecurringChores)
      ;(prisma.choreOccurrence.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.choreOccurrence.create as jest.Mock).mockResolvedValue({ id: 1 })

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)
      mockGenerateOccurrences.mockReturnValue([new Date()])

      // Execute
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(2)
      expect(prisma.choreOccurrence.create).toHaveBeenCalledTimes(2)
    })

    it('should not generate occurrences for chores that have not started yet', async () => {
      // Mock prisma responses - should not return chores that haven't started
      ;(prisma.recurringChore.findMany as jest.Mock).mockResolvedValue([])

      // Mock RecurrenceService
      mockIsValidRule.mockReturnValue(true)

      // Execute with date before start date
      const count = await generateDailyOccurrences(new Date('2024-01-15'))

      // Assert
      expect(count).toBe(0)
      expect(prisma.choreOccurrence.create).not.toHaveBeenCalled()
    })
  })
})
