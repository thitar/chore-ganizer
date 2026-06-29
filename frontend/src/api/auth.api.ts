import axios from 'axios'

const api = axios.create({ baseURL: '/api/auth', withCredentials: true })

export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}

export interface User {
  id: number
  email: string
  name: string
  role: string
  color: string
  createdAt: string
  updatedAt: string
}

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post('/login', { email, password })
  return response.data.data
}

export async function logout(): Promise<void> {
  await api.post('/logout')
}

export async function getCurrentUser(): Promise<User> {
  try {
    const response = await api.get('/me')
    return response.data.data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      throw new AuthError('Not authenticated', 401)
    }
    throw err
  }
}
