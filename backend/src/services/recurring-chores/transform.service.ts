/**
 * Transform recurring chore data for API response
 * Formats dates and extracts nested relations
 */

/**
 * Shape of a RecurringChore database record with standard includes.
 * Mirrors the RECURRING_CHORE_INCLUDE shape from recurring-chore-management.service.ts.
 */
interface RecurringChoreDbRecord {
  id: number
  title: string
  description: string | null
  points: number
  icon: string | null
  color: string | null
  categoryId: number | null
  createdById: number
  startDate: Date
  recurrenceRule: unknown
  assignmentMode: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  category?: { id: number; name: string } | null
  fixedAssignees?: Array<{
    id?: number
    userId?: number
    user?: { id: number; name: string; color: string | null }
  }>
  roundRobinPool?: Array<{
    id: number
    userId: number
    order: number
    recurringChoreId?: number
    user?: { id: number; name: string; color: string | null }
  }>
}

export function transformRecurringChore(dbRecord: RecurringChoreDbRecord) {
  const recurrenceRule = dbRecord.recurrenceRule

  return {
    ...dbRecord,
    recurrenceRule,
    startDate: dbRecord.startDate ? dbRecord.startDate.toISOString().split('T')[0] : null,
    createdAt: dbRecord.createdAt?.toISOString(),
    updatedAt: dbRecord.updatedAt?.toISOString(),
    fixedAssignees: dbRecord.fixedAssignees?.map((a) => a.user) || [],
    roundRobinPool: dbRecord.roundRobinPool?.map((p) => ({
      id: p.id,
      userId: p.userId,
      order: p.order,
      user: p.user,
    })) || [],
  }
}
