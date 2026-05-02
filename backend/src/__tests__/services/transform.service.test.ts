/**
 * Transform Service Tests
 *
 * Covers:
 * - transformRecurringChore: recurrenceRule parsing, date formatting,
 *   nested relation transformations, edge cases
 */

import { transformRecurringChore } from '../../services/recurring-chores/transform.service'

describe('Transform Service', () => {
  describe('transformRecurringChore', () => {
    it('should parse recurrenceRule from JSON string to object', () => {
      const dbRecord = {
        id: 1,
        title: 'Feed Pet',
        description: 'Feed the family pet',
        points: 5,
        icon: '🐕',
        color: '#F59E0B',
        categoryId: 1,
        createdById: 1,
        startDate: new Date('2024-01-01'),
        recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }) as unknown,
        assignmentMode: 'FIXED',
        isActive: true,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
        category: { id: 1, name: 'Household' },
        fixedAssignees: [
          { user: { id: 2, name: 'Test Child', color: '#10B981' } },
        ],
        roundRobinPool: [],
      }

      const result = transformRecurringChore(dbRecord)

      expect(result.recurrenceRule).toEqual({ frequency: 'DAILY', interval: 1 })
      expect(result.startDate).toBe('2024-01-01')
      expect(result.createdAt).toBe('2024-01-01T12:00:00.000Z')
      expect(result.fixedAssignees).toHaveLength(1)
      expect(result.fixedAssignees[0]).toEqual({ id: 2, name: 'Test Child', color: '#10B981' })
    })

    it('should handle recurrenceRule that is null', () => {
      const dbRecord = {
        id: 1,
        title: 'Simple Chore',
        description: null,
        points: 3,
        icon: null,
        color: null,
        categoryId: null,
        createdById: 1,
        startDate: new Date('2024-01-01'),
        recurrenceRule: null,
        assignmentMode: 'FIXED',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        fixedAssignees: [],
        roundRobinPool: [],
      }

      const result = transformRecurringChore(dbRecord)

      expect(result.recurrenceRule).toBeNull()
    })

    it('should handle recurrenceRule that is already an object', () => {
      const dbRecord = {
        id: 1,
        title: 'Weekly Clean',
        description: null,
        points: 10,
        icon: null,
        color: null,
        categoryId: null,
        createdById: 1,
        startDate: new Date('2024-01-01'),
        recurrenceRule: { frequency: 'WEEKLY', interval: 1 } as unknown,
        assignmentMode: 'FIXED',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        fixedAssignees: [],
        roundRobinPool: [],
      }

      const result = transformRecurringChore(dbRecord)

      expect(result.recurrenceRule).toEqual({ frequency: 'WEEKLY', interval: 1 })
    })

    it('should handle missing nested relations gracefully', () => {
      const dbRecord = {
        id: 1,
        title: 'Minimal Chore',
        description: null,
        points: 5,
        icon: null,
        color: null,
        categoryId: null,
        createdById: 1,
        startDate: new Date('2024-01-01'),
        recurrenceRule: null,
        assignmentMode: 'FIXED',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const result = transformRecurringChore(dbRecord as any)

      expect(result.fixedAssignees).toEqual([])
      expect(result.roundRobinPool).toEqual([])
      expect(result.startDate).toBe('2024-01-01')
    })

    it('should preserve full roundRobinPool entries', () => {
      const dbRecord = {
        id: 1,
        title: 'Rotating Chore',
        description: null,
        points: 5,
        icon: null,
        color: null,
        categoryId: null,
        createdById: 1,
        startDate: new Date('2024-01-01'),
        recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
        assignmentMode: 'ROUND_ROBIN',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        fixedAssignees: [],
        roundRobinPool: [
          {
            id: 10,
            userId: 2,
            order: 0,
            user: { id: 2, name: 'Child 1', color: '#10B981' },
          },
          {
            id: 11,
            userId: 3,
            order: 1,
            user: { id: 3, name: 'Child 2', color: '#F59E0B' },
          },
        ],
      }

      const result = transformRecurringChore(dbRecord)

      expect(result.roundRobinPool).toHaveLength(2)
      expect(result.roundRobinPool[0]).toEqual({
        id: 10,
        userId: 2,
        order: 0,
        user: { id: 2, name: 'Child 1', color: '#10B981' },
      })
    })

    it('should handle partial record with minimal fields', () => {
      const dbRecord = {
        id: 1,
        title: 'Test',
        points: 5,
        startDate: new Date('2024-06-15'),
        recurrenceRule: null,
        createdAt: new Date('2024-06-15T00:00:00Z'),
        updatedAt: new Date('2024-06-15T00:00:00Z'),
      }

      const result = transformRecurringChore(dbRecord as any)

      expect(result.id).toBe(1)
      expect(result.title).toBe('Test')
      expect(result.startDate).toBe('2024-06-15')
    })
  })
})
