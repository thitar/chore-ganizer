import apiClient from './client'
import type {
  RecurringChore,
  ChoreOccurrence,
  CreateRecurringChoreRequest,
  UpdateRecurringChoreRequest,
  CompleteOccurrenceRequest,
  SkipOccurrenceRequest,
  CompleteOccurrenceResponse,
  ChoreOccurrenceStatus,
} from '../types/recurring-chores'

export interface RecurringChoresListResponse {
  recurringChores: RecurringChore[]
}

export interface RecurringChoreResponse {
  recurringChore: RecurringChore
}

export interface OccurrencesListResponse {
  occurrences: ChoreOccurrence[]
}

export const recurringChoresApi = {
  // List all recurring chores
  list: async (params?: { includeInactive?: boolean }): Promise<RecurringChore[]> => {
    const response = await apiClient.get<RecurringChoresListResponse>('/recurring-chores', { params })
    return response.data?.recurringChores || []
  },

  // Get a single recurring chore
  get: async (id: number): Promise<RecurringChore> => {
    const response = await apiClient.get<RecurringChoreResponse>(`/recurring-chores/${id}`)
    return response.data?.recurringChore
  },

  // Create a new recurring chore
  create: async (data: CreateRecurringChoreRequest): Promise<RecurringChore> => {
    const response = await apiClient.post<RecurringChoreResponse>('/recurring-chores', data)
    return response.data?.recurringChore
  },

  // Update a recurring chore
  update: async (id: number, data: UpdateRecurringChoreRequest): Promise<RecurringChore> => {
    const response = await apiClient.put<RecurringChoreResponse>(`/recurring-chores/${id}`, data)
    return response.data?.recurringChore
  },

  // Delete a recurring chore
  delete: async (id: number, deleteFutureOccurrences?: boolean): Promise<void> => {
    await apiClient.delete(`/recurring-chores/${id}`, {
      params: { deleteFutureOccurrences },
    })
  },

  // List occurrences
  listOccurrences: async (params?: {
    status?: ChoreOccurrenceStatus
    assignedToMe?: boolean
  }): Promise<ChoreOccurrence[]> => {
    const response = await apiClient.get<OccurrencesListResponse>('/recurring-chores/occurrences', { params })
    return response.data?.occurrences || []
  },

  // Complete an occurrence
  completeOccurrence: async (
    id: number,
    data: CompleteOccurrenceRequest
  ): Promise<CompleteOccurrenceResponse> => {
    const response = await apiClient.patch<CompleteOccurrenceResponse>(
      `/recurring-chores/occurrences/${id}/complete`,
      data
    )
    return response.data
  },

  // Skip an occurrence
  skipOccurrence: async (id: number, data: SkipOccurrenceRequest): Promise<ChoreOccurrence> => {
    const response = await apiClient.patch<{ occurrence: ChoreOccurrence }>(
      `/recurring-chores/occurrences/${id}/skip`,
      data
    )
    return response.data?.occurrence
  },

  // Unskip an occurrence
  unskipOccurrence: async (id: number): Promise<ChoreOccurrence> => {
    const response = await apiClient.patch<{ occurrence: ChoreOccurrence }>(
      `/recurring-chores/occurrences/${id}/unskip`
    )
    return response.data?.occurrence
  },
}
