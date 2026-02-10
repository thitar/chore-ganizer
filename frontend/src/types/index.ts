export interface User {
  id: number
  email: string
  name: string
  role: 'PARENT' | 'CHILD'
  points: number
  createdAt: string
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
}

export interface UpdateChoreData {
  title?: string
  description?: string
  points?: number
  assignedToId?: number
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
