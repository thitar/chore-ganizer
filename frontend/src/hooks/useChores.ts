import { useState, useEffect } from 'react'
import { choresApi } from '../api'
import type { ChoreAssignment, CreateAssignmentData, UpdateAssignmentData } from '../types'

export function useChores(filters?: { status?: string; assignedToId?: number }) {
  const [chores, setChores] = useState<ChoreAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChores = async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await choresApi.getAll(filters)
      setChores(data)
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to fetch chores'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChores()
  }, [JSON.stringify(filters)])

  const createChore = async (data: CreateAssignmentData) => {
    try {
      setError(null)
      const chore = await choresApi.create(data)
      setChores([...chores, chore])
      return { success: true, chore }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to create chore'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateChore = async (id: number, data: UpdateAssignmentData) => {
    try {
      setError(null)
      const chore = await choresApi.update(id, data)
      setChores(chores.map((c) => (c.id === id ? chore : c)))
      return { success: true, chore }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to update chore'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteChore = async (id: number) => {
    try {
      setError(null)
      await choresApi.delete(id)
      setChores(chores.filter((c) => c.id !== id))
      return { success: true }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to delete chore'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const completeChore = async (id: number) => {
    try {
      setError(null)
      const result = await choresApi.complete(id)
      setChores(chores.map((c) => (c.id === id ? result.chore : c)))
      return { success: true, chore: result.chore, pointsAwarded: result.pointsAwarded }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to complete chore'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  return {
    chores,
    loading,
    error,
    createChore,
    updateChore,
    deleteChore,
    completeChore,
    refresh: fetchChores,
  }
}
