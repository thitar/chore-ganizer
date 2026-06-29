import prisma from '../../config/database.js'
import { RecurrenceRule } from '../recurrence.service.js'
import { generateOccurrencesForChore } from './occurrence.service.js'
import { calculateAssignedUserIds } from './assignment.service.js'

/**
 * Standard include for recurring chore queries with fixed assignees and round-robin pool
 */
export const RECURRING_CHORE_INCLUDE = {
  fixedAssignees: {
    include: {
      user: {
        select: { id: true, name: true, color: true } as const,
      },
    },
  },
  roundRobinPool: {
    include: {
      user: {
        select: { id: true, name: true, color: true } as const,
      },
    },
    orderBy: { order: 'asc' as const },
  },
  category: true,
}

/**
 * Update assignments for a recurring chore and reassign future pending occurrences
 */
export async function updateRecurringChoreAssignments(
  recurringChoreId: number,
  fixedAssigneeIds: number[] | undefined,
  roundRobinPoolIds: number[] | undefined,
  assignmentMode: string | undefined,
  existing: {
    fixedAssignees: { userId: number }[]
    roundRobinPool: { userId: number }[]
    assignmentMode: string
  }
): Promise<void> {
  const newFixedIds = fixedAssigneeIds ?? existing.fixedAssignees.map((a) => a.userId)
  const newRrPoolIds = roundRobinPoolIds ?? existing.roundRobinPool.map((p) => p.userId)

  await prisma.recurringChoreFixedAssignee.deleteMany({
    where: { recurringChoreId },
  })

  await prisma.recurringChoreRoundRobinPool.deleteMany({
    where: { recurringChoreId },
  })

  if (newFixedIds.length > 0) {
    await prisma.recurringChoreFixedAssignee.createMany({
      data: newFixedIds.map((userId: number) => ({
        recurringChoreId,
        userId,
      })),
    })
  }

  if (newRrPoolIds.length > 0) {
    await prisma.recurringChoreRoundRobinPool.createMany({
      data: newRrPoolIds.map((userId: number, index: number) => ({
        recurringChoreId,
        userId,
        order: index,
      })),
    })
  }

  const mode = assignmentMode ?? existing.assignmentMode

  const now = new Date()
  const pendingOccurrences = await prisma.choreOccurrence.findMany({
    where: {
      recurringChoreId,
      status: 'PENDING',
      dueDate: { gte: now },
    },
    orderBy: { dueDate: 'asc' },
  })

  for (let i = 0; i < pendingOccurrences.length; i++) {
    const occ = pendingOccurrences[i]
    const { assignedUserIds } = calculateAssignedUserIds(
      mode,
      newFixedIds as number[],
      newRrPoolIds as number[],
      i
    )

    await prisma.choreOccurrence.update({
      where: { id: occ.id },
      data: {
        assignedUserIds: JSON.stringify(assignedUserIds),
        roundRobinIndex: i,
      },
    })
  }
}

/**
 * Regenerate future occurrences when recurrence rule changes
 */
export async function regenerateFutureOccurrences(
  recurringChoreId: number,
  recurrenceRule: RecurrenceRule,
  startDate: string | undefined,
  existingStartDate: Date | null,
  fixedAssigneeIds: number[] | undefined,
  roundRobinPoolIds: number[] | undefined,
  assignmentMode: string | undefined,
  existing: {
    fixedAssignees: { userId: number }[]
    roundRobinPool: { userId: number }[]
    assignmentMode: string
  }
): Promise<void> {
  const now = new Date()
  await prisma.choreOccurrence.deleteMany({
    where: {
      recurringChoreId,
      status: 'PENDING',
      dueDate: { gte: now },
    },
  })

  const fixedIds = fixedAssigneeIds ?? existing.fixedAssignees.map((a) => a.userId)
  const rrPoolIds = roundRobinPoolIds ?? existing.roundRobinPool.map((p) => p.userId)
  const mode = assignmentMode ?? existing.assignmentMode

  const start = startDate
    ? new Date(startDate)
    : (existingStartDate ? new Date(existingStartDate) : now)

  await generateOccurrencesForChore(
    recurringChoreId,
    recurrenceRule,
    start,
    mode,
    fixedIds,
    rrPoolIds,
    0
  )
}
