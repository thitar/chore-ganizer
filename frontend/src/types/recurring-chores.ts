import type { User, ChoreCategory } from './index'

// Recurrence rule types
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type AssignmentMode = 'FIXED' | 'ROUND_ROBIN' | 'MIXED'
export type ChoreOccurrenceStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED'

export interface NthWeekday {
  week: number  // 1-5
  day: number   // 0-6 (Sun-Sat)
}

export interface RecurrenceRule {
  frequency: Frequency
  interval: number
  dayOfWeek?: number[]   // 0-6 (Sun-Sat)
  dayOfMonth?: number    // 1-31
  nthWeekday?: NthWeekday
}

export interface RoundRobinPoolMember {
  id: number
  userId: number
  order: number
  user: User
}

export interface RecurringChore {
  id: number
  title: string
  description: string | null
  points: number
  categoryId: number | null
  recurrenceRule: RecurrenceRule
  startDate: string
  assignmentMode: AssignmentMode
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: ChoreCategory | null
  fixedAssignees: User[]
  roundRobinPool: RoundRobinPoolMember[]
}

export interface ChoreOccurrence {
  id: number
  recurringChoreId: number
  recurringChore: RecurringChore
  dueDate: string
  status: ChoreOccurrenceStatus
  assignedUserIds: number[]
  assignedUsers: User[]
  completedById: number | null
  completedBy: User | null
  completedAt: string | null
  skippedById: number | null
  skippedBy: User | null
  skippedAt: string | null
  skipReason: string | null
}

// Request types
export interface CreateRecurringChoreRequest {
  title: string
  description?: string
  points?: number
  categoryId?: number
  recurrenceRule: RecurrenceRule
  startDate: string
  assignmentMode: AssignmentMode
  fixedAssigneeIds?: number[]
  roundRobinPoolIds?: number[]
}

export interface UpdateRecurringChoreRequest extends Partial<CreateRecurringChoreRequest> {}

export interface CompleteOccurrenceRequest {
  completedById: number
}

export interface SkipOccurrenceRequest {
  skippedById: number
}

// Response types
export interface CompleteOccurrenceResponse {
  occurrence: ChoreOccurrence
  pointsAwarded: number
}
