import client from './client'
import type { ChoreAssignment, CreateAssignmentData, UpdateAssignmentData, ApiResponse } from '../types'

export const assignmentsApi = {
  getAll: async (params?: {
    status?: string
    userId?: number
    fromDate?: string
    toDate?: string
  }): Promise<ChoreAssignment[]> => {
    const response = await client.get<{ assignments: ChoreAssignment[] }>('/chore-assignments', { params })
    return response.data?.assignments || []
  },

  getById: async (id: number): Promise<ChoreAssignment> => {
    const response = await client.get<{ assignment: ChoreAssignment }>(`/chore-assignments/${id}`)
    return response.data?.assignment
  },

  getUpcoming: async (days: number = 7): Promise<ChoreAssignment[]> => {
    const response = await client.get<{ assignments: ChoreAssignment[] }>('/chore-assignments/upcoming', {
      params: { days },
    })
    return response.data?.assignments || []
  },

  getOverdue: async (): Promise<ChoreAssignment[]> => {
    const response = await client.get<{ assignments: ChoreAssignment[] }>('/chore-assignments/overdue')
    return response.data?.assignments || []
  },

  getCalendar: async (year?: number, month?: number): Promise<{
    year: number
    month: number
    assignments: ChoreAssignment[]
    days: Record<number, ChoreAssignment[]>
  }> => {
    const response = await client.get<{
      year: number
      month: number
      assignments: ChoreAssignment[]
      days: Record<number, ChoreAssignment[]>
    }>('/chore-assignments/calendar', { params: { year, month } })
    return response.data || { year: year || new Date().getFullYear(), month: month || new Date().getMonth() + 1, assignments: [], days: {} }
  },

  create: async (data: CreateAssignmentData): Promise<ChoreAssignment> => {
    const response = await client.post<{ assignment: ChoreAssignment }>('/chore-assignments', data)
    return response.data?.assignment
  },

  update: async (id: number, data: UpdateAssignmentData): Promise<ChoreAssignment> => {
    const response = await client.put<{ assignment: ChoreAssignment }>(`/chore-assignments/${id}`, data)
    return response.data?.assignment
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/chore-assignments/${id}`)
  },

  complete: async (id: number): Promise<{ assignment: ChoreAssignment; pointsAwarded: number }> => {
    const response = await client.post<{ assignment: ChoreAssignment; pointsAwarded: number }>(
      `/chore-assignments/${id}/complete`
    )
    return response.data || { assignment: {} as ChoreAssignment, pointsAwarded: 0 }
  },
}
