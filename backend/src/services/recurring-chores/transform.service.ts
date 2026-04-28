import { AppError } from '../../middleware/errorHandler.js'

/**
 * Transform recurring chore data for API response
 * Parses recurrenceRule from JSON string and formats dates
 */
export function transformRecurringChore(dbRecord: any) {
  let recurrenceRule = null
  if (dbRecord.recurrenceRule) {
    try {
      recurrenceRule = JSON.parse(dbRecord.recurrenceRule)
    } catch {
      throw new AppError('Invalid recurrence rule data', 500, 'DATA_INTEGRITY_ERROR')
    }
  }

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
