import prisma from '../../config/database.js'
import { RecurrenceService, RecurrenceRule } from '../recurrence.service.js'
import { calculateAssignedUserIds } from './assignment.service.js'

export async function generateOccurrencesForChore(
  recurringChoreId: number,
  recurrenceRule: RecurrenceRule,
  startDate: Date,
  assignmentMode: string,
  fixedAssigneeIds: number[],
  roundRobinPoolIds: number[],
  initialRoundRobinIndex: number | null
): Promise<void> {
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  const occurrenceDates = RecurrenceService.generateOccurrences(
    recurrenceRule,
    startDate,
    endDate
  )

  // Check existing occurrences in a single query
  const existingOccurrences = await prisma.choreOccurrence.findMany({
    where: {
      recurringChoreId,
      dueDate: { in: occurrenceDates },
    },
    select: { dueDate: true },
  })
  const existingDates = new Set(existingOccurrences.map(o => o.dueDate.toISOString()))

  // Build batch insert data
  const occurrencesToCreate = []
  for (let i = 0; i < occurrenceDates.length; i++) {
    const dueDate = occurrenceDates[i]
    if (existingDates.has(dueDate.toISOString())) continue

    const occurrenceRoundRobinIndex = initialRoundRobinIndex !== null ? initialRoundRobinIndex + i : null
    const { assignedUserIds } = calculateAssignedUserIds(
      assignmentMode,
      fixedAssigneeIds,
      roundRobinPoolIds,
      occurrenceRoundRobinIndex
    )

    occurrencesToCreate.push({
      recurringChoreId,
      dueDate,
      status: 'PENDING',
      assignedUserIds: JSON.stringify(assignedUserIds),
      roundRobinIndex: occurrenceRoundRobinIndex,
    })
  }

  if (occurrencesToCreate.length > 0) {
    await prisma.choreOccurrence.createMany({
      data: occurrencesToCreate,
    })
  }
}
