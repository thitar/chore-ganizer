import client from './client'
import type { ChoreTemplate, CreateTemplateData, UpdateTemplateData, ApiResponse } from '../types'

export const templatesApi = {
  getAll: async (): Promise<ChoreTemplate[]> => {
    const response = await client.get<{ templates: ChoreTemplate[] }>('/chore-templates')
    return response.data?.templates || []
  },

  getById: async (id: number): Promise<ChoreTemplate> => {
    const response = await client.get<{ template: ChoreTemplate }>(`/chore-templates/${id}`)
    return response.data?.template
  },

  create: async (data: CreateTemplateData): Promise<ChoreTemplate> => {
    const response = await client.post<{ template: ChoreTemplate }>('/chore-templates', data)
    return response.data?.template
  },

  update: async (id: number, data: UpdateTemplateData): Promise<ChoreTemplate> => {
    const response = await client.put<{ template: ChoreTemplate }>(`/chore-templates/${id}`, data)
    return response.data?.template
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/chore-templates/${id}`)
  },
}
