import apiClient from './client'
import type { User, CreateUserData, UpdateUserData, ApiResponse } from '../types'

export interface UsersResponse {
  users: User[]
}

export interface UserResponse {
  user: User
}

export const usersApi = {
  getAll: () =>
    apiClient.get<UsersResponse>('/users'),

  getById: (id: number) =>
    apiClient.get<UserResponse>(`/users/${id}`),

  create: (data: CreateUserData) =>
    apiClient.post<UserResponse>('/users', data),

  update: (id: number, data: UpdateUserData) =>
    apiClient.put<UserResponse>(`/users/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<{ message: string }>(`/users/${id}`),
}
