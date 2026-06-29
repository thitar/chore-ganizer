import apiClient from './client'
import type { User, LoginCredentials, ApiResponse } from '../types'

export interface LoginResponse {
  user: User
}

export interface MeResponse {
  user: User
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
  role?: 'PARENT' | 'CHILD'
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<LoginResponse>('/auth/login', credentials),

  register: (credentials: RegisterCredentials) =>
    apiClient.post<LoginResponse>('/auth/register', credentials),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout'),

  getCurrentUser: () =>
    apiClient.get<MeResponse>('/auth/me'),
}
