import prisma from '../../config/database.js'
import { AppError } from '../../middleware/errorHandler.js'

function safeParseAssignedUserIds(assignedUserIds: string): number[] {
  try {
    return JSON.parse(assignedUserIds) as number[]
  } catch {
    throw new AppError('Invalid occurrence data', 500, 'DATA_INTEGRITY_ERROR')
  }
}

/**
 * Fetch assigned users for a list of occurrences and attach them
 */
export async function attachAssignedUsersToOccurrences(occurrences: any[]) {
  return Promise.all(
    occurrences.map(async (occ) => {
      const assignedIds = safeParseAssignedUserIds(occ.assignedUserIds)
      const assignedUsers = await prisma.user.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, name: true, color: true },
      })
      return { ...occ, assignedUsers }
    })
  )
}

/**
 * Update round-robin assignments for subsequent pending occurrences after one is completed
 */
export async function updateRoundRobinAfterCompletion(
  recurringChoreId: number,
  assignmentMode: string,
  currentRoundRobinIndex: number,
  pool: { userId: number }[],
  fixedIds: number[]
): Promise<void> {
  const now = new Date()
  const subsequentOccurrences = await prisma.choreOccurrence.findMany({
    where: {
      recurringChoreId,
      status: 'PENDING',
      dueDate: { gt: now },
    },
    orderBy: { dueDate: 'asc' },
  })

  for (let i = 0; i < subsequentOccurrences.length; i++) {
    const occ = subsequentOccurrences[i]
    const occurrenceIndex = currentRoundRobinIndex + 1 + i
    const poolIndex = occurrenceIndex % pool.length
    const nextAssigneeId = pool[poolIndex].userId

    const newAssignedIds = assignmentMode === 'ROUND_ROBIN'
      ? [nextAssigneeId]
      : [...fixedIds, nextAssigneeId]

    await prisma.choreOccurrence.update({
      where: { id: occ.id },
      data: {
        assignedUserIds: JSON.stringify(newAssignedIds),
        roundRobinIndex: occurrenceIndex,
      },
    })
  }
}

/**
 * Award points to a user if they are in the assigned list
 */
export async function awardPointsForCompletion(
  userId: number,
  assignedUserIds: string,
  points: number
): Promise<void> {
  const assignedIds = safeParseAssignedUserIds(assignedUserIds)
  if (assignedIds.includes(userId)) {
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: points } },
    })
  }
}
