export interface User {
  id: number
  email: string
  name: string
  role: 'PARENT' | 'CHILD'
  points: number
  basePocketMoney: number // Base pocket money in euros
  color: string | null
  createdAt: string
}

export interface ChoreCategory {
  id: number
  name: string
  description: string | null
  icon: string | null
  color: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    templates: number
  }
}

export interface ChoreTemplate {
  id: number
  title: string
  description: string | null
  points: number
  icon: string | null
  color: string | null
  categoryId: number | null
  category: {
    id: number
    name: string
  } | null
  createdById: number
  createdBy: {
    id: number
    name: string
  }
  createdAt: string
  updatedAt: string
  _count?: {
    assignments: number
  }
}

export interface ChoreAssignment {
  id: number
  choreTemplateId: number
  choreTemplate: ChoreTemplate
  assignedToId: number
  assignedTo: {
    id: number
    name: string
    color: string | null
  }
  dueDate: string
  status: 'PENDING' | 'COMPLETED' | 'PARTIALLY_COMPLETE'
  notes: string | null
  createdAt: string
  completedAt: string | null
  isOverdue: boolean
}

export interface Chore {
  id: number
  title: string
  description: string | null
  points: number
  status: 'PENDING' | 'COMPLETED'
  assignedToId: number
  assignedTo: {
    id: number
    name: string
  }
  createdAt: string
  completedAt: string | null
}

export interface Notification {
  id: number
  userId: number
  type: 'CHORE_ASSIGNED' | 'CHORE_COMPLETED' | 'POINTS_EARNED'
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface CreateChoreData {
  title: string
  description?: string
  points: number
  assignedToId: number
  categoryId?: number
}

export interface UpdateChoreData {
  title?: string
  description?: string
  points?: number
  assignedToId?: number
  categoryId?: number
}

export interface CreateCategoryData {
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  icon?: string
  color?: string
}

export interface CreateTemplateData {
  title: string
  description?: string
  points: number
  icon?: string
  color?: string
  categoryId?: number
}

export interface UpdateTemplateData {
  title?: string
  description?: string
  points?: number
  icon?: string
  color?: string
  categoryId?: number
}

export interface CreateAssignmentData {
  choreTemplateId: number
  assignedToId: number
  dueDate: string
}

export interface UpdateAssignmentData {
  assignedToId?: number
  dueDate?: string
  status?: 'PENDING' | 'COMPLETED'
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  role: 'PARENT' | 'CHILD'
}

export interface UpdateUserData {
  name?: string
  role?: 'PARENT' | 'CHILD'
  color?: string
  email?: string
  basePocketMoney?: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface ApiError {
  success: false
  error: {
    message: string
    code: string
    details?: Array<{
      field: string
      message: string
    }>
  }
}

// Recurring Chores types
export * from './recurring-chores'

// Pocket Money types
export * from './pocket-money'
