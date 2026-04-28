/**
 * Calculate assigned user IDs based on assignment mode
 */
export function calculateAssignedUserIds(
  assignmentMode: string,
  fixedAssigneeIds: number[],
  roundRobinPoolIds: number[],
  roundRobinIndex: number | null
): { assignedUserIds: number[]; roundRobinIndex: number | null } {
  switch (assignmentMode) {
    case 'FIXED':
      return { assignedUserIds: fixedAssigneeIds, roundRobinIndex: null }

    case 'ROUND_ROBIN':
      if (roundRobinPoolIds.length === 0) {
        return { assignedUserIds: [], roundRobinIndex: null }
      }
      const rrIndex = roundRobinIndex ?? 0
      const currentAssignee = roundRobinPoolIds[rrIndex % roundRobinPoolIds.length]
      return { assignedUserIds: [currentAssignee], roundRobinIndex: rrIndex }

    case 'MIXED':
      if (roundRobinPoolIds.length === 0) {
        return { assignedUserIds: fixedAssigneeIds, roundRobinIndex: null }
      }
      const mixedRrIndex = roundRobinIndex ?? 0
      const mixedCurrentAssignee = roundRobinPoolIds[mixedRrIndex % roundRobinPoolIds.length]
      return {
        assignedUserIds: [...fixedAssigneeIds, mixedCurrentAssignee],
        roundRobinIndex: mixedRrIndex,
      }

    default:
      return { assignedUserIds: [], roundRobinIndex: null }
  }
}
