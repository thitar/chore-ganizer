/**
 * Transform recurring chore data for API response
 * Parses recurrenceRule from JSON string and formats dates
 */
export function transformRecurringChore(dbRecord: any) {
  return {
    ...dbRecord,
    recurrenceRule: dbRecord.recurrenceRule ? JSON.parse(dbRecord.recurrenceRule) : null,
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
