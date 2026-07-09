// ChoreAssignment and RecurringOccurrence auto-increment independently, so
// the same numeric id can refer to either — always key/compare on both.
export function assignmentKey(a: { id: number; type?: 'REGULAR' | 'RECURRING' }): string {
  return `${a.type}-${a.id}`
}
