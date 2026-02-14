import apiClient from './client'
import type { User, CreateUserData, UpdateUserData } from '../types'

export interface UsersResponse {
  users: User[]
}

export interface UserResponse {
  user: User
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

  create: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post<{ user: User }>('/users', data)
    return response.data?.user
  },

  update: async (id: number, data: UpdateUserData): Promise<User> => {
    const response = await apiClient.put<{ user: User }>(`/users/${id}`, data)
    return response.data?.user
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}
