import { useState, useEffect } from 'react'
import { usersApi } from '../api'
import type { User, CreateUserData, UpdateUserData } from '../types'

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await usersApi.getAll()
      setUsers(response.data.users)
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to fetch users'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const createUser = async (data: CreateUserData) => {
    try {
      setError(null)
      const response = await usersApi.create(data)
      setUsers([...users, response.data.user])
      return { success: true, user: response.data.user }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to create user'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateUser = async (id: number, data: UpdateUserData) => {
    try {
      setError(null)
      const response = await usersApi.update(id, data)
      setUsers(users.map((u) => (u.id === id ? response.data.user : u)))
      return { success: true, user: response.data.user }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to update user'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteUser = async (id: number) => {
    try {
      setError(null)
      await usersApi.delete(id)
      setUsers(users.filter((u) => u.id !== id))
      return { success: true }
    } catch (err: any) {
      const errorMessage = err.error?.message || 'Failed to delete user'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refresh: fetchUsers,
  }
}
