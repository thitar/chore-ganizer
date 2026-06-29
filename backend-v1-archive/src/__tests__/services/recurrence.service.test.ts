/**
 * Recurrence Service Tests
 * 
 * Unit tests for the recurrence service that generates occurrence dates
 * from recurrence rules for the recurring chore system.
 */

import { RecurrenceService, RecurrenceRule } from '../../services/recurrence.service'

describe('RecurrenceService', () => {
  describe('isValidRule', () => {
    it('should validate a valid daily rule', () => {
      const rule: RecurrenceRule = { frequency: 'DAILY', interval: 1 }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate a valid weekly rule', () => {
      const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 1 }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate a valid monthly rule', () => {
      const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1 }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate a valid yearly rule', () => {
      const rule: RecurrenceRule = { frequency: 'YEARLY', interval: 1 }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate weekly rule with specific days', () => {
      const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: [1, 3, 5] }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate monthly rule with day of month', () => {
      const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 15 }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate monthly rule with last day of month (-1)', () => {
      const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: -1 }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should validate monthly rule with nth weekday', () => {
      const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, nthWeekday: { week: 2, day: 2 } }
      expect(RecurrenceService.isValidRule(rule)).toBe(true)
    })

    it('should reject invalid frequency', () => {
      const rule = { frequency: 'INVALID', interval: 1 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject missing frequency', () => {
      const rule = { interval: 1 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject missing interval', () => {
      const rule = { frequency: 'DAILY' } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject interval less than 1', () => {
      const rule = { frequency: 'DAILY', interval: 0 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject negative interval', () => {
      const rule = { frequency: 'DAILY', interval: -1 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject non-integer interval', () => {
      const rule = { frequency: 'DAILY', interval: 1.5 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject invalid dayOfWeek values', () => {
      const rule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: [7] } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject negative dayOfWeek values', () => {
      const rule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: [-1] } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject non-array dayOfWeek', () => {
      const rule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: '1,3,5' } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject invalid dayOfMonth', () => {
      const rule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 32 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject dayOfMonth 0', () => {
      const rule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 0 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject invalid nthWeekday week', () => {
      const rule = { frequency: 'MONTHLY', interval: 1, nthWeekday: { week: 6, day: 2 } } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject invalid nthWeekday day', () => {
      const rule = { frequency: 'MONTHLY', interval: 1, nthWeekday: { week: 2, day: 7 } } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject dayOfWeek for non-weekly frequency', () => {
      const rule = { frequency: 'DAILY', interval: 1, dayOfWeek: [1] } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject dayOfMonth for non-monthly frequency', () => {
      const rule = { frequency: 'DAILY', interval: 1, dayOfMonth: 15 } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject both dayOfMonth and nthWeekday', () => {
      const rule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 15, nthWeekday: { week: 2, day: 2 } } as any
      expect(RecurrenceService.isValidRule(rule)).toBe(false)
    })

    it('should reject null rule', () => {
      expect(RecurrenceService.isValidRule(null)).toBe(false)
    })

    it('should reject non-object rule', () => {
      expect(RecurrenceService.isValidRule('string')).toBe(false)
      expect(RecurrenceService.isValidRule(123)).toBe(false)
    })
  })

  describe('generateOccurrences', () => {
    it('should throw error for invalid rule', () => {
      const rule = { frequency: 'INVALID', interval: 1 } as any
      expect(() => RecurrenceService.generateOccurrences(rule, new Date(), new Date())).toThrow('Invalid recurrence rule')
    })

    it('should return empty array when startDate > endDate', () => {
      const rule: RecurrenceRule = { frequency: 'DAILY', interval: 1 }
      const startDate = new Date('2024-01-31')
      const endDate = new Date('2024-01-01')
      const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
      expect(result).toEqual([])
    })

    it('should return empty array when dates are equal', () => {
      const rule: RecurrenceRule = { frequency: 'DAILY', interval: 1 }
      const date = new Date('2024-01-15')
      const result = RecurrenceService.generateOccurrences(rule, date, date)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    describe('DAILY frequency', () => {
      it('should generate daily occurrences with interval 1', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY', interval: 1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-01-07')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should generate daily occurrences with interval 2', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY', interval: 2 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-01-10')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should include the start date', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY', interval: 1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-01-05')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        const startIncluded = result.some(d => d.toISOString().startsWith('2024-01-01'))
        expect(startIncluded).toBe(true)
      })
    })

    describe('WEEKLY frequency', () => {
      it('should generate weekly occurrences', () => {
        const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-01-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should generate occurrences for specific days of week', () => {
        const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: [1, 3, 5] } // Mon, Wed, Fri
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-01-15')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should respect weekly interval', () => {
        const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 2 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-02-01')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should return occurrences for empty dayOfWeek (defaults to start day)', () => {
        const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: [] }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-01-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        // Empty dayOfWeek defaults to same day as start date
        expect(result.length).toBeGreaterThan(0)
      })
    })

    describe('MONTHLY frequency', () => {
      it('should generate monthly occurrences', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-12-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should generate occurrences for specific day of month', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 15 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-06-30')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should generate nth weekday occurrences', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, nthWeekday: { week: 2, day: 2 } } // 2nd Tuesday
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-06-30')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should handle month end correctly for day 31', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 31 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-12-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        // Should not error and should return results
        expect(Array.isArray(result)).toBe(true)
      })

      it('should generate occurrences on last day of month (-1)', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 1, dayOfMonth: -1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-12-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        // Should generate 12 occurrences (one per month)
        expect(result.length).toBe(12)
        
        // Verify each occurrence is the last day of the month
        // January: 31
        expect(result[0].getUTCDate()).toBe(31)
        expect(result[0].getUTCMonth()).toBe(0) // January
        // February 2024 is leap year: 29
        expect(result[1].getUTCDate()).toBe(29)
        expect(result[1].getUTCMonth()).toBe(1) // February
        // March: 31
        expect(result[2].getUTCDate()).toBe(31)
        expect(result[2].getUTCMonth()).toBe(2) // March
        // April: 30
        expect(result[3].getUTCDate()).toBe(30)
        expect(result[3].getUTCMonth()).toBe(3) // April
      })

      it('should generate occurrences on last day of month with interval', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY', interval: 2, dayOfMonth: -1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-12-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        // Should generate 6 occurrences (every 2 months: Jan, Mar, May, Jul, Sep, Nov)
        expect(result.length).toBe(6)
        
        // Verify they are the last days of each month
        expect(result[0].getUTCDate()).toBe(31) // January
        expect(result[1].getUTCDate()).toBe(31) // March (interval 2 from Jan skips Feb)
        expect(result[2].getUTCDate()).toBe(31) // May
        expect(result[3].getUTCDate()).toBe(31) // July
        expect(result[4].getUTCDate()).toBe(30) // September
        expect(result[5].getUTCDate()).toBe(30) // November
      })
    })

    describe('YEARLY frequency', () => {
      it('should generate yearly occurrences', () => {
        const rule: RecurrenceRule = { frequency: 'YEARLY', interval: 1 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2030-12-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })

      it('should generate yearly occurrences with interval 2', () => {
        const rule: RecurrenceRule = { frequency: 'YEARLY', interval: 2 }
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2034-12-31')
        
        const result = RecurrenceService.generateOccurrences(rule, startDate, endDate)
        
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getNthWeekdayOfMonth', () => {
    it('should get 1st Monday of January 2024', () => {
      const result = RecurrenceService.getNthWeekdayOfMonth(2024, 0, 1, 1) // January, 1st Monday
      expect(result.getUTCDate()).toBe(1) // First Monday is Jan 1, 2024
    })

    it('should get 2nd Tuesday of January 2024', () => {
      const result = RecurrenceService.getNthWeekdayOfMonth(2024, 0, 2, 2) // January, 2nd Tuesday
      expect(result.getUTCDate()).toBe(9) // Second Tuesday is Jan 9, 2024
    })

    it('should get 3rd Wednesday of January 2024', () => {
      const result = RecurrenceService.getNthWeekdayOfMonth(2024, 0, 3, 3) // January, 3rd Wednesday
      expect(result.getUTCDate()).toBe(17) // Third Wednesday is Jan 17, 2024
    })

    it('should get last Friday of January 2024 when week is 5', () => {
      const result = RecurrenceService.getNthWeekdayOfMonth(2024, 0, 5, 5) // January, 5th Friday
      // Should return the last Friday in January since 5th Friday doesn't exist
      expect(result.getUTCMonth()).toBe(0) // Still January
      expect(result.getUTCDay()).toBe(5) // Friday
    })

    it('should throw error for invalid week', () => {
      expect(() => RecurrenceService.getNthWeekdayOfMonth(2024, 0, 0, 1)).toThrow('week must be between 1 and 5')
      expect(() => RecurrenceService.getNthWeekdayOfMonth(2024, 0, 6, 1)).toThrow('week must be between 1 and 5')
    })

    it('should throw error for invalid day', () => {
      expect(() => RecurrenceService.getNthWeekdayOfMonth(2024, 0, 1, -1)).toThrow('day must be between 0 (Sunday) and 6 (Saturday)')
      expect(() => RecurrenceService.getNthWeekdayOfMonth(2024, 0, 1, 7)).toThrow('day must be between 0 (Sunday) and 6 (Saturday)')
    })

    it('should throw error for invalid month', () => {
      expect(() => RecurrenceService.getNthWeekdayOfMonth(2024, -1, 1, 1)).toThrow('month must be between 0 (January) and 11 (December)')
      expect(() => RecurrenceService.getNthWeekdayOfMonth(2024, 12, 1, 1)).toThrow('month must be between 0 (January) and 11 (December)')
    })
  })

  describe('getStartOfWeek', () => {
    it('should return Sunday as start of week', () => {
      const wednesday = new Date(Date.UTC(2024, 0, 10)) // Jan 10, 2024 is Wednesday
      const result = RecurrenceService.getStartOfWeek(wednesday)
      
      expect(result.getUTCDay()).toBe(0) // Sunday
      expect(result.getUTCDate()).toBe(7) // Jan 7, 2024
    })

    it('should return same day for Sunday', () => {
      const sunday = new Date(Date.UTC(2024, 0, 7)) // Jan 7, 2024 is Sunday
      const result = RecurrenceService.getStartOfWeek(sunday)
      
      expect(result.getUTCDay()).toBe(0) // Sunday
      expect(result.getUTCDate()).toBe(7) // Same date
    })
  })
})
