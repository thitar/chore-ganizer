import apiClient from './client'
import type { ChoreAssignment, CreateAssignmentData, UpdateAssignmentData } from '../types'

export interface ChoresResponse {
  chores: ChoreAssignment[]
}

export interface ChoreResponse {
  chore: ChoreAssignment
}

export interface CompleteChoreResponse {
  chore: ChoreAssignment
  pointsAwarded: number
  userPoints: number
}

// This API is kept for backward compatibility
// All endpoints now use /api/chore-assignments
export const choresApi = {
  getAll: async (params?: { status?: string; assignedToId?: number }): Promise<ChoreAssignment[]> => {
    const response = await apiClient.get<{ assignments: ChoreAssignment[] }>('/chore-assignments', { params })
    return response.data?.assignments || []
  },

  getById: async (id: number): Promise<ChoreAssignment> => {
    const response = await apiClient.get<{ assignment: ChoreAssignment }>(`/chore-assignments/${id}`)
    return response.data?.assignment
  },

  create: async (data: CreateAssignmentData): Promise<ChoreAssignment> => {
    const response = await apiClient.post<{ assignment: ChoreAssignment }>('/chore-assignments', data)
    return response.data?.assignment
  },

  update: async (id: number, data: UpdateAssignmentData): Promise<ChoreAssignment> => {
    const response = await apiClient.put<{ assignment: ChoreAssignment }>(`/chore-assignments/${id}`, data)
    return response.data?.assignment
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/chore-assignments/${id}`)
  },

  complete: async (id: number): Promise<{ chore: ChoreAssignment; pointsAwarded: number; userPoints: number }> => {
    const response = await apiClient.post<{ assignment: ChoreAssignment; pointsAwarded: number }>(
      `/chore-assignments/${id}/complete`
    )
    const data = response.data
    return { 
      chore: data?.assignment || {} as ChoreAssignment, 
      pointsAwarded: data?.pointsAwarded || 0,
      userPoints: 0 // This is no longer returned by the API
    }
  },
}
