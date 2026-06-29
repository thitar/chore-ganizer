import { useState, useEffect, useCallback } from 'react'
import { templatesApi } from '../api'
import type { ChoreTemplate, CreateTemplateData, UpdateTemplateData } from '../types'

interface UseTemplatesReturn {
  templates: ChoreTemplate[]
  loading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  createTemplate: (data: CreateTemplateData) => Promise<{ success: boolean; message?: string }>
  updateTemplate: (id: number, data: UpdateTemplateData) => Promise<{ success: boolean; message?: string }>
  deleteTemplate: (id: number) => Promise<{ success: boolean; message?: string }>
}

export const useTemplates = (): UseTemplatesReturn => {
  const [templates, setTemplates] = useState<ChoreTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await templatesApi.getAll()
      if (Array.isArray(response)) {
        setTemplates(response)
      } else {
        setTemplates([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createTemplate = async (data: CreateTemplateData) => {
    try {
      const response = await templatesApi.create(data)
      if (response) {
        await fetchTemplates()
        return { success: true }
      }
      return { success: false, message: 'Failed to create template' }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to create template' 
      }
    }
  }

  const updateTemplate = async (id: number, data: UpdateTemplateData) => {
    try {
      const response = await templatesApi.update(id, data)
      if (response) {
        await fetchTemplates()
        return { success: true }
      }
      return { success: false, message: 'Failed to update template' }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to update template' 
      }
    }
  }

  const deleteTemplate = async (id: number) => {
    try {
      await templatesApi.delete(id)
      await fetchTemplates()
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to delete template' 
      }
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
