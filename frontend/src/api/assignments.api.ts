import client from './client'
import type { ChoreAssignment, CreateAssignmentData, UpdateAssignmentData, ApiResponse } from '../types'

export const assignmentsApi = {
  getAll: async (params?: {
    status?: string
    userId?: number
    fromDate?: string
    toDate?: string
  }): Promise<ChoreAssignment[]> => {
    // Pass the inner data type (not ApiResponse) to client.get
    // client.get returns ApiResponse<T>, so response.data = { assignments: [...] }
    // Map userId to assignedToId for the backend API
    const apiParams: any = {}
    if (params?.status) apiParams.status = params.status
    if (params?.userId) apiParams.assignedToId = params.userId
    if (params?.fromDate) apiParams.dueDateFrom = params.fromDate
    if (params?.toDate) apiParams.dueDateTo = params.toDate
    
    const response = await client.get<{ assignments: ChoreAssignment[] }>('/chore-assignments', { params: apiParams })
    const assignments = response.data?.assignments || []
    return assignments
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
    }>('/chore-assignments/calendar', { params: { year, month } })
    const result = response.data || { assignments: [], year: year || new Date().getFullYear(), month: month || new Date().getMonth() + 1 }
    
    // Group assignments by day
    const days: Record<number, ChoreAssignment[]> = {}
    for (const assignment of result.assignments) {
      const dueDate = new Date(assignment.dueDate)
      const day = dueDate.getDate()
      if (!days[day]) {
        days[day] = []
      }
      days[day].push(assignment)
    }
    
    return {
      year: result.year,
      month: result.month,
      assignments: result.assignments,
      days,
    }
  },

  create: async (data: CreateAssignmentData): Promise<ChoreAssignment> => {
    // Map frontend field names to backend expected names
    const payload = {
      choreTemplateId: data.templateId,
      assignedToId: data.assignedToId,
      dueDate: data.dueDate,
    }
    const response = await client.post<{ assignment: ChoreAssignment }>('/chore-assignments', payload)
    return response.data?.assignment
  },

  update: async (id: number, data: UpdateAssignmentData): Promise<ChoreAssignment> => {
    const response = await client.put<{ assignment: ChoreAssignment }>(`/chore-assignments/${id}`, data)
    return response.data?.assignment
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/chore-assignments/${id}`)
  },

  complete: async (id: number, options?: { status?: 'COMPLETED' | 'PARTIALLY_COMPLETE'; customPoints?: number }): Promise<{ assignment: ChoreAssignment; pointsAwarded: number }> => {
    const response = await client.post<{ success: boolean; data: { assignment: ChoreAssignment; pointsAwarded: number } }>(
      `/chore-assignments/${id}/complete`,
      options
    )
    const data = response.data?.data
    return data || { assignment: {} as ChoreAssignment, pointsAwarded: 0 }
  },
}
