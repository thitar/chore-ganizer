import { useState, useEffect, useCallback } from 'react'
import { categoriesApi } from '../api/categories.api'
import type { ChoreCategory, CreateCategoryData, UpdateCategoryData, ChoreTemplate } from '../types'

interface UseCategoriesReturn {
  categories: ChoreCategory[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createCategory: (data: CreateCategoryData) => Promise<ChoreCategory>
  updateCategory: (id: number, data: UpdateCategoryData) => Promise<ChoreCategory>
  deleteCategory: (id: number) => Promise<void>
  getCategoryTemplates: (id: number) => Promise<ChoreTemplate[]>
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<ChoreCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoriesApi.getAll()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const createCategory = useCallback(async (data: CreateCategoryData): Promise<ChoreCategory> => {
    const category = await categoriesApi.create(data)
    await refetch()
    return category
  }, [refetch])

  const updateCategory = useCallback(async (id: number, data: UpdateCategoryData): Promise<ChoreCategory> => {
    const category = await categoriesApi.update(id, data)
    await refetch()
    return category
  }, [refetch])

  const deleteCategory = useCallback(async (id: number): Promise<void> => {
    await categoriesApi.delete(id)
    await refetch()
  }, [refetch])

  const getCategoryTemplates = useCallback(async (id: number) => {
    return categoriesApi.getTemplates(id)
  }, [])

  return {
    categories,
    loading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryTemplates,
  }
}
