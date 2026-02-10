import { useState, useEffect } from 'react'
import { choresApi } from '../api'
import type { Chore, CreateChoreData, UpdateChoreData } from '../types'

export function useChores(filters?: { status?: string; assignedToId?: number }) {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChores = async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await choresApi.getAll(filters)
      setChores(response.data.chores)
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

  const createChore = async (data: CreateChoreData) => {
    try {
      setError(null)
      const response = await choresApi.create(data)
      setChores([...chores, response.data.chore])
      return { success: true, chore: response.data.chore }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to create chore'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateChore = async (id: number, data: UpdateChoreData) => {
    try {
      setError(null)
      const response = await choresApi.update(id, data)
      setChores(chores.map((c) => (c.id === id ? response.data.chore : c)))
      return { success: true, chore: response.data.chore }
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
      const response = await choresApi.complete(id)
      setChores(chores.map((c) => (c.id === id ? response.data.chore : c)))
      return { success: true, chore: response.data.chore, pointsAwarded: response.data.pointsAwarded }
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
