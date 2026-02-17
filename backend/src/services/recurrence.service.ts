/**
 * Recurrence Service
 * 
 * Generates occurrence dates from recurrence rules for the recurring chore system.
 * Handles DAILY, WEEKLY, MONTHLY, and YEARLY frequencies with various patterns.
 */

/**
 * Recurrence rule configuration for generating occurrence dates
 */
export interface RecurrenceRule {
  /** Base frequency of recurrence */
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  /** "Every N" modifier (e.g., 2 for "every 2 weeks") */
  interval: number
  /** Days of week for specific day patterns (0=Sunday, 6=Saturday) */
  dayOfWeek?: number[]
  /** Nth day of month (1-31) for monthly patterns */
  dayOfMonth?: number
  /** Nth weekday of month pattern (e.g., "2nd Tuesday") */
  nthWeekday?: {
    /** Which occurrence (1-5 for first through fifth) */
    week: number
    /** Day of week (0=Sunday, 6=Saturday) */
    day: number
  }
}

/**
 * Type guard to check if a value is a valid frequency
 */
function isValidFrequency(value: unknown): value is RecurrenceRule['frequency'] {
  return typeof value === 'string' && ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value)
}

/**
 * Type guard to check if a value is a valid nthWeekday object
 */
function isValidNthWeekday(value: unknown): value is RecurrenceRule['nthWeekday'] {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.week === 'number' &&
    typeof obj.day === 'number' &&
    obj.week >= 1 &&
    obj.week <= 5 &&
    obj.day >= 0 &&
    obj.day <= 6
  )
}

/**
 * Get the number of days in a given month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/**
 * Get the day of week for a specific date (UTC)
 */
function getUTCDay(date: Date): number {
  return date.getUTCDay()
}

/**
 * Recurrence Service
 * 
 * Provides methods for generating occurrence dates from recurrence rules.
 */
export const RecurrenceService = {
  /**
   * Generate all occurrence dates between startDate and endDate based on the recurrence rule.
   * 
   * @param rule - The recurrence rule defining the pattern
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of occurrence dates within the specified range
   * @throws Error if the rule is invalid
   * 
   * @example
   * // Every Mon/Wed/Fri
   * const rule = { frequency: 'WEEKLY', interval: 1, dayOfWeek: [1, 3, 5] }
   * const occurrences = RecurrenceService.generateOccurrences(rule, new Date('2024-01-01'), new Date('2024-01-31'))
   */
  generateOccurrences(rule: RecurrenceRule, startDate: Date, endDate: Date): Date[] {
    if (!this.isValidRule(rule)) {
      throw new Error('Invalid recurrence rule')
    }

    if (startDate > endDate) {
      return []
    }

    // Normalize dates to UTC midnight
    const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
    const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))

    switch (rule.frequency) {
      case 'DAILY':
        return this.generateDailyOccurrences(rule, start, end)
      case 'WEEKLY':
        return this.generateWeeklyOccurrences(rule, start, end)
      case 'MONTHLY':
        return this.generateMonthlyOccurrences(rule, start, end)
      case 'YEARLY':
        return this.generateYearlyOccurrences(rule, start, end)
      default:
        return []
    }
  },

  /**
   * Generate daily occurrences
   */
  generateDailyOccurrences(rule: RecurrenceRule, startDate: Date, endDate: Date): Date[] {
    const occurrences: Date[] = []
    const interval = rule.interval

    // Start from the beginning of the range and generate all occurrences
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      occurrences.push(new Date(currentDate))
      currentDate = new Date(currentDate)
      currentDate.setUTCDate(currentDate.getUTCDate() + interval)
    }

    return occurrences
  },

  /**
   * Generate weekly occurrences
   */
  generateWeeklyOccurrences(rule: RecurrenceRule, startDate: Date, endDate: Date): Date[] {
    const occurrences: Date[] = []
    const interval = rule.interval
    const daysOfWeek = rule.dayOfWeek

    if (daysOfWeek && daysOfWeek.length > 0) {
      // Specific days of week pattern (e.g., Mon/Wed/Fri)
      // Validate daysOfWeek
      const validDays = daysOfWeek.filter(d => d >= 0 && d <= 6).sort((a, b) => a - b)
      
      if (validDays.length === 0) {
        return []
      }

      // Calculate week number from a reference point to handle intervals
      const referenceDate = new Date(Date.UTC(2000, 0, 3)) // Monday Jan 3, 2000 as reference
      
      // Find the first week that matches the interval pattern
      let currentWeekStart = this.getStartOfWeek(startDate)
      
      while (currentWeekStart <= endDate) {
        // Calculate which week number this is from reference
        const weeksSinceReference = Math.floor(
          (currentWeekStart.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
        
        // Check if this week matches the interval
        if (weeksSinceReference % interval === 0) {
          for (const dayOfWeek of validDays) {
            const occurrence = new Date(currentWeekStart)
            occurrence.setUTCDate(occurrence.getUTCDate() + dayOfWeek)
            
            if (occurrence >= startDate && occurrence <= endDate) {
              occurrences.push(occurrence)
            }
          }
        }
        
        currentWeekStart = new Date(currentWeekStart)
        currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7)
      }
    } else {
      // Same day of week as start date, every N weeks
      const startDayOfWeek = getUTCDay(startDate)
      
      // Find the first occurrence on or after startDate
      let currentDate = new Date(startDate)
      
      // Calculate week number from a reference point
      const referenceDate = new Date(Date.UTC(2000, 0, 3)) // Monday Jan 3, 2000
      
      while (currentDate <= endDate) {
        const weeksSinceReference = Math.floor(
          (currentDate.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
        
        if (weeksSinceReference % interval === 0 && getUTCDay(currentDate) === startDayOfWeek) {
          occurrences.push(new Date(currentDate))
        }
        
        currentDate = new Date(currentDate)
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      }
    }

    return occurrences.sort((a, b) => a.getTime() - b.getTime())
  },

  /**
   * Generate monthly occurrences
   */
  generateMonthlyOccurrences(rule: RecurrenceRule, startDate: Date, endDate: Date): Date[] {
    const occurrences: Date[] = []
    const interval = rule.interval

    if (rule.dayOfMonth !== undefined) {
      // Nth day of month (e.g., 15th of every month)
      const targetDay = rule.dayOfMonth
      
      // Start from the month of startDate
      let currentYear = startDate.getUTCFullYear()
      let currentMonth = startDate.getUTCMonth()
      
      // Reference month for interval calculation
      const referenceMonth = 0 // January 2000 as reference
      
      while (true) {
        // Calculate months since reference
        const monthsSinceReference = (currentYear - 2000) * 12 + currentMonth - referenceMonth
        
        if (monthsSinceReference % interval === 0) {
          const daysInMonth = getDaysInMonth(currentYear, currentMonth)
          const actualDay = Math.min(targetDay, daysInMonth)
          
          const occurrence = new Date(Date.UTC(currentYear, currentMonth, actualDay))
          
          if (occurrence > endDate) break
          if (occurrence >= startDate) {
            occurrences.push(occurrence)
          }
        }
        
        // Move to next month
        currentMonth++
        if (currentMonth > 11) {
          currentMonth = 0
          currentYear++
        }
        
        // Safety check to prevent infinite loops
        if (currentYear > endDate.getUTCFullYear() + 1) break
      }
    } else if (rule.nthWeekday) {
      // Nth weekday of month (e.g., 2nd Tuesday)
      const { week, day } = rule.nthWeekday
      
      let currentYear = startDate.getUTCFullYear()
      let currentMonth = startDate.getUTCMonth()
      
      while (true) {
        const monthsSinceReference = (currentYear - 2000) * 12 + currentMonth
        
        if (monthsSinceReference % interval === 0) {
          const occurrence = this.getNthWeekdayOfMonth(currentYear, currentMonth, week, day)
          
          if (occurrence > endDate) break
          if (occurrence >= startDate) {
            occurrences.push(occurrence)
          }
        }
        
        // Move to next month
        currentMonth++
        if (currentMonth > 11) {
          currentMonth = 0
          currentYear++
        }
        
        if (currentYear > endDate.getUTCFullYear() + 1) break
      }
    } else {
      // Same day of month as start date, every N months
      const targetDay = startDate.getUTCDate()
      
      let currentYear = startDate.getUTCFullYear()
      let currentMonth = startDate.getUTCMonth()
      
      while (true) {
        const monthsSinceReference = (currentYear - 2000) * 12 + currentMonth
        
        if (monthsSinceReference % interval === 0) {
          const daysInMonth = getDaysInMonth(currentYear, currentMonth)
          const actualDay = Math.min(targetDay, daysInMonth)
          
          const occurrence = new Date(Date.UTC(currentYear, currentMonth, actualDay))
          
          if (occurrence > endDate) break
          if (occurrence >= startDate) {
            occurrences.push(occurrence)
          }
        }
        
        currentMonth++
        if (currentMonth > 11) {
          currentMonth = 0
          currentYear++
        }
        
        if (currentYear > endDate.getUTCFullYear() + 1) break
      }
    }

    return occurrences.sort((a, b) => a.getTime() - b.getTime())
  },

  /**
   * Generate yearly occurrences
   */
  generateYearlyOccurrences(rule: RecurrenceRule, startDate: Date, endDate: Date): Date[] {
    const occurrences: Date[] = []
    const interval = rule.interval
    
    // Use the start date's month and day
    const targetMonth = startDate.getUTCMonth()
    const targetDay = startDate.getUTCDate()
    
    let currentYear = startDate.getUTCFullYear()
    
    while (true) {
      const yearsSinceReference = currentYear - 2000
      
      if (yearsSinceReference % interval === 0) {
        // Handle leap year for Feb 29
        const daysInMonth = getDaysInMonth(currentYear, targetMonth)
        const actualDay = Math.min(targetDay, daysInMonth)
        
        const occurrence = new Date(Date.UTC(currentYear, targetMonth, actualDay))
        
        if (occurrence > endDate) break
        if (occurrence >= startDate) {
          occurrences.push(occurrence)
        }
      }
      
      currentYear++
      
      if (currentYear > endDate.getUTCFullYear() + 1) break
    }

    return occurrences
  },

  /**
   * Get the Nth weekday of a given month.
   * 
   * @param year - Full year (e.g., 2024)
   * @param month - Month (0-11, where 0 is January)
   * @param week - Which occurrence (1-5 for first through fifth)
   * @param day - Day of week (0-6, where 0 is Sunday)
   * @returns The date of the Nth weekday, or the last occurrence if week 5 doesn't exist
   * 
   * @example
   * // Get 2nd Tuesday of January 2024
   * RecurrenceService.getNthWeekdayOfMonth(2024, 0, 2, 2) // Returns Jan 9, 2024
   */
  getNthWeekdayOfMonth(year: number, month: number, week: number, day: number): Date {
    if (week < 1 || week > 5) {
      throw new Error('week must be between 1 and 5')
    }
    if (day < 0 || day > 6) {
      throw new Error('day must be between 0 (Sunday) and 6 (Saturday)')
    }
    if (month < 0 || month > 11) {
      throw new Error('month must be between 0 (January) and 11 (December)')
    }

    // Start from the first day of the month
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1))
    const firstDayOfWeek = firstDayOfMonth.getUTCDay()

    // Calculate the date of the first occurrence of the target day
    // If the first day of month is the target day, offset is 0
    // Otherwise, calculate how many days until the first target day
    let daysUntilFirstTarget: number
    if (firstDayOfWeek <= day) {
      daysUntilFirstTarget = day - firstDayOfWeek
    } else {
      daysUntilFirstTarget = 7 - (firstDayOfWeek - day)
    }

    const firstOccurrence = 1 + daysUntilFirstTarget
    
    // Calculate the Nth occurrence
    const nthOccurrence = firstOccurrence + (week - 1) * 7
    
    // Check if this date exists in the month
    const daysInMonth = getDaysInMonth(year, month)
    
    if (nthOccurrence > daysInMonth) {
      // The Nth occurrence doesn't exist in this month
      // Return the last occurrence of that day instead
      const lastOccurrence = firstOccurrence + Math.floor((daysInMonth - firstOccurrence) / 7) * 7
      return new Date(Date.UTC(year, month, lastOccurrence))
    }

    return new Date(Date.UTC(year, month, nthOccurrence))
  },

  /**
   * Get the start of the week (Sunday) for a given date
   */
  getStartOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() - day)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  },

  /**
   * Validate that a recurrence rule object has the correct structure.
   * 
   * @param rule - The rule object to validate
   * @returns true if the rule is valid, false otherwise
   * 
   * @example
   * RecurrenceService.isValidRule({ frequency: 'WEEKLY', interval: 1 }) // true
   * RecurrenceService.isValidRule({ frequency: 'INVALID', interval: 1 }) // false
   */
  isValidRule(rule: unknown): rule is RecurrenceRule {
    if (typeof rule !== 'object' || rule === null) {
      return false
    }

    const obj = rule as Record<string, unknown>

    // Check required fields
    if (!isValidFrequency(obj.frequency)) {
      return false
    }

    if (typeof obj.interval !== 'number' || obj.interval < 1 || !Number.isInteger(obj.interval)) {
      return false
    }

    // Validate optional dayOfWeek
    if (obj.dayOfWeek !== undefined) {
      if (!Array.isArray(obj.dayOfWeek)) {
        return false
      }
      if (!obj.dayOfWeek.every(d => typeof d === 'number' && d >= 0 && d <= 6)) {
        return false
      }
    }

    // Validate optional dayOfMonth
    if (obj.dayOfMonth !== undefined) {
      if (typeof obj.dayOfMonth !== 'number' || obj.dayOfMonth < 1 || obj.dayOfMonth > 31 || !Number.isInteger(obj.dayOfMonth)) {
        return false
      }
    }

    // Validate optional nthWeekday
    if (obj.nthWeekday !== undefined) {
      if (!isValidNthWeekday(obj.nthWeekday)) {
        return false
      }
    }

    // Check for valid combinations
    // dayOfWeek only makes sense for WEEKLY frequency
    if (obj.dayOfWeek !== undefined && obj.frequency !== 'WEEKLY') {
      return false
    }

    // dayOfMonth and nthWeekday only make sense for MONTHLY frequency
    if (obj.dayOfMonth !== undefined && obj.frequency !== 'MONTHLY') {
      return false
    }

    if (obj.nthWeekday !== undefined && obj.frequency !== 'MONTHLY') {
      return false
    }

    // Can't have both dayOfMonth and nthWeekday
    if (obj.dayOfMonth !== undefined && obj.nthWeekday !== undefined) {
      return false
    }

    return true
  }
}

export default RecurrenceService
