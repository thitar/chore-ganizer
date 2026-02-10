import apiClient from './client'
import type { Chore, CreateChoreData, UpdateChoreData, ApiResponse } from '../types'

export interface ChoresResponse {
  chores: Chore[]
}

export interface ChoreResponse {
  chore: Chore
}

export interface CompleteChoreResponse {
  chore: Chore
  pointsAwarded: number
  userPoints: number
}

export const choresApi = {
  getAll: (params?: { status?: string; assignedToId?: number }) =>
    apiClient.get<ChoresResponse>('/chores', { params }),

  getById: (id: number) =>
    apiClient.get<ChoreResponse>(`/chores/${id}`),

  create: (data: CreateChoreData) =>
    apiClient.post<ChoreResponse>('/chores', data),

  update: (id: number, data: UpdateChoreData) =>
    apiClient.put<ChoreResponse>(`/chores/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<{ message: string }>(`/chores/${id}`),

  complete: (id: number) =>
    apiClient.post<CompleteChoreResponse>(`/chores/${id}/complete`),
}
