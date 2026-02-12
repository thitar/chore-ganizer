import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../api'
import type { User, LoginCredentials } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isParent: boolean
  isChild: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('[AuthProvider] checkAuth called')
      const response = await authApi.getCurrentUser()
      console.log('[AuthProvider] checkAuth response:', response)
      setUser(response.data.user)
    } catch (err) {
      console.log('[AuthProvider] checkAuth error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('[AuthProvider] login called with:', credentials)
      setError(null)
      const response = await authApi.login(credentials)
      console.log('[AuthProvider] login response:', response)
      setUser(response.data.user)
      return { success: true }
    } catch (err: any) {
      console.error('[AuthProvider] login error:', err)
      const errorMessage = err.error?.message || 'Login failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isParent: user?.role === 'PARENT',
    isChild: user?.role === 'CHILD',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
