/**
 * Transform recurring chore data for API response
 * Formats dates and extracts nested relations
 */
export function transformRecurringChore(dbRecord: any) {
  const recurrenceRule = dbRecord.recurrenceRule

  return {
    ...dbRecord,
    recurrenceRule,
    startDate: dbRecord.startDate ? dbRecord.startDate.toISOString().split('T')[0] : null,
    createdAt: dbRecord.createdAt?.toISOString(),
    updatedAt: dbRecord.updatedAt?.toISOString(),
    fixedAssignees: dbRecord.fixedAssignees?.map((a: any) => a.user) || [],
    roundRobinPool: dbRecord.roundRobinPool?.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      order: p.order,
      user: p.user,
    })) || [],
  }
}
