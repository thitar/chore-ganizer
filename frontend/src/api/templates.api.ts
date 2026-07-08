import axios from 'axios'
import { applyCsrfInterceptor } from '../lib/csrf'

const api = applyCsrfInterceptor(axios.create({ baseURL: '/api/templates', withCredentials: true }))

export interface Template {
  id: number
  title: string
  description: string | null
  points: number
  category: string | null
  createdById: number
  createdAt: string
  updatedAt: string
}

export async function getAll(): Promise<Template[]> {
  const response = await api.get('/')
  return response.data.data
}

export async function create(data: {
  title: string
  points: number
  category?: string | null
  description?: string | null
}): Promise<Template> {
  const response = await api.post('/', data)
  return response.data.data
}

export async function update(
  id: number,
  data: { title?: string; points?: number; category?: string | null; description?: string | null }
): Promise<Template> {
  const response = await api.put(`/${id}`, data)
  return response.data.data
}

export async function delete_(id: number): Promise<{ deleted: true }> {
  const response = await api.delete(`/${id}`)
  return response.data.data
}
