import cron, { ScheduledTask } from 'node-cron'
import prisma from '../config/database.js'
import { logger } from '../utils/logger.js'
import { RecurrenceService, RecurrenceRule } from '../services/recurrence.service.js'

// Run every day at midnight UTC
const CRON_SCHEDULE = '0 0 * * *'

/**
 * Generate chore occurrences for a specific date based on active recurring chores.
 * 
 * This function:
 * 1. Fetches all active recurring chores
 * 2. Uses the RecurrenceService to check if each recurring chore should generate an occurrence today
 * 3. Creates ChoreOccurrence records for matching recurring chores
 * 4. Handles assignment based on assignment mode (FIXED, ROUND_ROBIN, MIXED)
 * 
 * @param targetDate - The date to generate occurrences for (defaults to today)
 * @returns Number of occurrences created
 */
export const generateDailyOccurrences = async (targetDate: Date = new Date()): Promise<number> => {
  // Normalize to UTC midnight
  const today = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate()
  ))
  
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  logger.info('Starting daily occurrence generation', { 
    date: today.toISOString(),
  })

  // Get all active recurring chores
  const recurringChores = await prisma.recurringChore.findMany({
    where: {
      isActive: true,
      startDate: {
        lte: tomorrow, // Only chores that have started
      },
    },
    include: {
      fixedAssignees: {
        include: {
          user: true,
        },
      },
      roundRobinPool: {
        include: {
          user: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  })

  let createdCount = 0
  const errors: Array<{ recurringChoreId: number; error: string }> = []

  for (const rc of recurringChores) {
    try {
      // Parse the recurrence rule
      let recurrenceRule: RecurrenceRule
      try {
        recurrenceRule = JSON.parse(rc.recurrenceRule)
      } catch (parseError) {
        logger.error('Failed to parse recurrence rule', { 
          recurringChoreId: rc.id, 
          recurrenceRule: rc.recurrenceRule 
        })
        errors.push({ recurringChoreId: rc.id, error: 'Invalid recurrence rule JSON' })
        continue
      }

      // Validate the recurrence rule
      if (!RecurrenceService.isValidRule(recurrenceRule)) {
        logger.error('Invalid recurrence rule structure', { 
          recurringChoreId: rc.id, 
          recurrenceRule 
        })
        errors.push({ recurringChoreId: rc.id, error: 'Invalid recurrence rule structure' })
        continue
      }

      // Check if this recurring chore should generate an occurrence today
      const occurrences = RecurrenceService.generateOccurrences(
        recurrenceRule,
        today,
        today
      )

      if (occurrences.length === 0) {
        // No occurrence for this recurring chore today
        continue
      }

      // Check if occurrence already exists for this date
      const existingOccurrence = await prisma.choreOccurrence.findUnique({
        where: {
          recurringChoreId_dueDate: {
            recurringChoreId: rc.id,
            dueDate: today,
          },
        },
      })

      if (existingOccurrence) {
        // Occurrence already exists, skip
        continue
      }

      // Get current round-robin index for tracking (queried once and passed to getAssignedUserIds)
      const lastOccurrence = await prisma.choreOccurrence.findFirst({
        where: {
          recurringChoreId: rc.id,
        },
        orderBy: {
          dueDate: 'desc',
        },
      })

      // Determine assigned users based on assignment mode
      const assignedUserIds = await getAssignedUserIds(rc, lastOccurrence)

      if (assignedUserIds.length === 0) {
        logger.warn('No assignees found for recurring chore', { 
          recurringChoreId: rc.id,
          assignmentMode: rc.assignmentMode,
        })
        continue
      }

      let roundRobinIndex: number | null = null
      if (rc.assignmentMode === 'ROUND_ROBIN' || rc.assignmentMode === 'MIXED') {
        // Calculate next round-robin index
        const poolSize = rc.roundRobinPool.length
        if (poolSize > 0) {
          const lastIndex = lastOccurrence?.roundRobinIndex ?? -1
          roundRobinIndex = (lastIndex + 1) % poolSize
        }
      }

      // Create the occurrence
      await prisma.choreOccurrence.create({
        data: {
          recurringChoreId: rc.id,
          dueDate: today,
          status: 'PENDING',
          assignedUserIds: JSON.stringify(assignedUserIds),
          roundRobinIndex,
        },
      })

      createdCount++
      logger.info('Created chore occurrence', { 
        recurringChoreId: rc.id,
        dueDate: today.toISOString(),
        assignedUserIds,
      })
    } catch (error) {
      logger.error('Error processing recurring chore', { 
        recurringChoreId: rc.id, 
        error: error instanceof Error ? error.message : String(error) 
      })
      errors.push({ 
        recurringChoreId: rc.id, 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  logger.info('Daily occurrence generation complete', { 
    createdCount,
    processedCount: recurringChores.length,
    errorCount: errors.length,
  })

  if (errors.length > 0) {
    logger.warn('Errors during occurrence generation', { errors })
  }

  return createdCount
}

/**
 * Get assigned user IDs based on the assignment mode
 * @param rc - The recurring chore with assignees
 * @param lastOccurrence - The last occurrence (pre-fetched to avoid duplicate queries)
 */
interface RecurringChoreWithAssignees {
  id: number
  assignmentMode: string
  fixedAssignees: Array<{ userId: number }>
  roundRobinPool: Array<{ userId: number; order: number }>
}

interface LastOccurrence {
  roundRobinIndex: number | null
}

async function getAssignedUserIds(
  rc: RecurringChoreWithAssignees,
  lastOccurrence: LastOccurrence | null
): Promise<number[]> {
  const assignedUserIds: number[] = []

  switch (rc.assignmentMode) {
    case 'FIXED':
      // All fixed assignees are assigned
      for (const fa of rc.fixedAssignees) {
        assignedUserIds.push(fa.userId)
      }
      break

    case 'ROUND_ROBIN': {
      // Get the next person in the rotation
      const pool = rc.roundRobinPool
      if (pool.length > 0) {
        const lastIndex = lastOccurrence?.roundRobinIndex ?? -1
        const nextIndex = (lastIndex + 1) % pool.length
        assignedUserIds.push(pool[nextIndex].userId)
      }
      break
    }

    case 'MIXED':
      // Fixed assignees plus round-robin person
      for (const fa of rc.fixedAssignees) {
        assignedUserIds.push(fa.userId)
      }
      
      {
        const pool = rc.roundRobinPool
        if (pool.length > 0) {
          const lastIndex = lastOccurrence?.roundRobinIndex ?? -1
          const nextIndex = (lastIndex + 1) % pool.length
          assignedUserIds.push(pool[nextIndex].userId)
        }
      }
      break

    default:
      logger.warn('Unknown assignment mode', { 
        recurringChoreId: rc.id, 
        assignmentMode: rc.assignmentMode 
      })
  }

  return assignedUserIds
}

/**
 * Start the scheduled cron job for daily occurrence generation
 */
export const startOccurrenceJob = (): void => {
  // Validate cron schedule is valid
  if (!cron.validate(CRON_SCHEDULE)) {
    logger.error('Invalid cron schedule', { schedule: CRON_SCHEDULE })
    throw new Error(`Invalid cron schedule: ${CRON_SCHEDULE}`)
  }

  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      logger.info('Starting scheduled occurrence generation')
      await generateDailyOccurrences()
    } catch (error) {
      logger.error('Error in scheduled occurrence job', { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  })

  logger.info('Occurrence job scheduled', { schedule: CRON_SCHEDULE })
}

/**
 * Stop all scheduled jobs (for graceful shutdown)
 * Note: node-cron doesn't provide a global stop, so we track tasks internally
 */
const scheduledTasks: ScheduledTask[] = []

export const startOccurrenceJobWithTracking = (): void => {
  if (!cron.validate(CRON_SCHEDULE)) {
    logger.error('Invalid cron schedule', { schedule: CRON_SCHEDULE })
    throw new Error(`Invalid cron schedule: ${CRON_SCHEDULE}`)
  }

  const task = cron.schedule(CRON_SCHEDULE, async () => {
    try {
      logger.info('Starting scheduled occurrence generation')
      await generateDailyOccurrences()
    } catch (error) {
      logger.error('Error in scheduled occurrence job', { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  })

  scheduledTasks.push(task)
  logger.info('Occurrence job scheduled with tracking', { schedule: CRON_SCHEDULE })
}

export const stopAllOccurrenceJobs = (): void => {
  for (const task of scheduledTasks) {
    task.stop()
  }
  logger.info('All occurrence jobs stopped', { count: scheduledTasks.length })
}

export default {
  generateDailyOccurrences,
  startOccurrenceJob,
  startOccurrenceJobWithTracking,
  stopAllOccurrenceJobs,
}
