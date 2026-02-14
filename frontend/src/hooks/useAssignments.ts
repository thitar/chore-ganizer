import { useState, useEffect, useCallback } from 'react'
import { assignmentsApi } from '../api'
import type { ChoreAssignment, CreateAssignmentData, UpdateAssignmentData } from '../types'

interface UseAssignmentsReturn {
  assignments: ChoreAssignment[]
  loading: boolean
  error: string | null
  fetchAssignments: () => Promise<void>
  createAssignment: (data: CreateAssignmentData) => Promise<{ success: boolean; message?: string }>
  updateAssignment: (id: number, data: UpdateAssignmentData) => Promise<{ success: boolean; message?: string }>
  deleteAssignment: (id: number) => Promise<{ success: boolean; message?: string }>
  completeAssignment: (id: number, options?: { status?: 'COMPLETED' | 'PARTIALLY_COMPLETE'; customPoints?: number }) => Promise<{ success: boolean; pointsAwarded?: number; message?: string }>
}

export const useAssignments = (): UseAssignmentsReturn => {
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await assignmentsApi.getAll()
      if (Array.isArray(response)) {
        setAssignments(response)
      } else {
        setAssignments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createAssignment = async (data: CreateAssignmentData) => {
    try {
      await assignmentsApi.create(data)
      await fetchAssignments()
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to create assignment' 
      }
    }
  }

  const updateAssignment = async (id: number, data: UpdateAssignmentData) => {
    try {
      await assignmentsApi.update(id, data)
      await fetchAssignments()
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to update assignment' 
      }
    }
  }

  const deleteAssignment = async (id: number) => {
    try {
      await assignmentsApi.delete(id)
      await fetchAssignments()
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to delete assignment' 
      }
    }
  }

  const completeAssignment = async (id: number, options?: { status?: 'COMPLETED' | 'PARTIALLY_COMPLETE'; customPoints?: number }) => {
    try {
      const response = await assignmentsApi.complete(id, options)
      await fetchAssignments()
      return { success: true, pointsAwarded: response.pointsAwarded }
    } catch (err) {
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to complete assignment' 
      }
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  return {
    assignments,
    loading,
    error,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    completeAssignment,
  }
}
