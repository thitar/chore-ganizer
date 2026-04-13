import apiClient from './client'
import type { User, CreateUserData, UpdateUserData, UserWithStats } from '../types'

export interface UsersResponse {
  users: User[]
}

export interface UserResponse {
  user: User
}

export interface UserAssignmentsResponse {
  assignments: any[]
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get<{ users: User[] }>('/users')
    return response.data?.users || []
  },

  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get<{ user: User }>(`/users/${id}`)
    return response.data?.user
  },

  getWithStats: async (id: number): Promise<UserWithStats> => {
    const response = await apiClient.get<{ user: UserWithStats }>(`/users/${id}`)
    return response.data?.user
  },

  getAssignments: async (id: number, status?: string) => {
    const params = status ? `?status=${status}` : ''
    const response = await apiClient.get<{ assignments: any[] }>(`/users/${id}/assignments${params}`)
    return response.data?.assignments || []
  },

  create: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post<{ user: User }>('/users', data)
    return response.data?.user
  },

  update: async (id: number, data: UpdateUserData): Promise<User> => {
    const response = await apiClient.put<{ user: User }>(`/users/${id}`, data)
    return response.data?.user
  },

  updateMe: async (data: Partial<UpdateUserData>): Promise<User> => {
    const response = await apiClient.patch<{ user: User }>('/users/me', data)
    return response.data?.user
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },

  lock: async (id: number): Promise<User> => {
    const response = await apiClient.post<{ user: User }>(`/users/${id}/lock`, {})
    return response.data?.user
  },

  unlock: async (id: number): Promise<User> => {
    const response = await apiClient.post<{ user: User }>(`/users/${id}/unlock`, {})
    return response.data?.user
  },
}
