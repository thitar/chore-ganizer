import client from './client'
import type { ChoreCategory, CreateCategoryData, UpdateCategoryData, ChoreTemplate } from '../types'

export const categoriesApi = {
  getAll: async (): Promise<ChoreCategory[]> => {
    const response = await client.get<{ categories: ChoreCategory[] }>('/chore-categories')
    return response.data?.categories || []
  },

  getById: async (id: number): Promise<ChoreCategory> => {
    const response = await client.get<{ category: ChoreCategory }>(`/chore-categories/${id}`)
    return response.data?.category
  },

  create: async (data: CreateCategoryData): Promise<ChoreCategory> => {
    const response = await client.post<{ category: ChoreCategory }>('/chore-categories', data)
    return response.data?.category
  },

  update: async (id: number, data: UpdateCategoryData): Promise<ChoreCategory> => {
    const response = await client.put<{ category: ChoreCategory }>(`/chore-categories/${id}`, data)
    return response.data?.category
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/chore-categories/${id}`)
  },

  getTemplates: async (id: number): Promise<ChoreTemplate[]> => {
    const response = await client.get<{ templates: ChoreTemplate[] }>(`/chore-categories/${id}/templates`)
    return response.data?.templates || []
  },
}
