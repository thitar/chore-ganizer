import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../api'
import type { User, LoginCredentials } from '../types'
import type { RegisterCredentials } from '../api/auth.api'

// Enable debug logging in development OR when debug is enabled in config
const isDev = import.meta.env.DEV
const debugEnabled = isDev || window.APP_CONFIG?.debug === true || import.meta.env.VITE_DEBUG === 'true'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
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

  // Re-check auth when window gains focus (e.g., user returns to tab after deleting cookies)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !user) {
        // Only re-check if not currently authenticated
        if (debugEnabled) {
          console.log('[AuthProvider] Visibility changed to visible, re-checking auth...')
        }
        checkAuth()
      }
    }

    const handleFocus = () => {
      // Re-check auth when window gains focus
      if (debugEnabled) {
        console.log('[AuthProvider] Window gained focus, re-checking auth...')
      }
      if (!user) {
        checkAuth()
      }
    }

    // Listen for unauthorized events from API client
    const handleUnauthorized = () => {
      if (debugEnabled) {
        console.log('[AuthProvider] Received unauthorized event, logging out...')
      }
      setUser(null)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [user])

  const checkAuth = async () => {
    try {
      if (debugEnabled) {
        console.log('[AuthProvider] checkAuth called')
      }
      const response = await authApi.getCurrentUser()
      if (debugEnabled) {
        console.log('[AuthProvider] checkAuth response:', response)
      }
      setUser(response.data.user)
    } catch (err) {
      if (debugEnabled) {
        console.log('[AuthProvider] checkAuth error:', err)
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      if (debugEnabled) {
        console.log('[AuthProvider] login called with:', credentials)
      }
      setError(null)
      const response = await authApi.login(credentials)
      if (debugEnabled) {
        console.log('[AuthProvider] login response:', response)
      }
      setUser(response.data.user)
      return { success: true }
    } catch (err: any) {
      if (debugEnabled) {
        console.error('[AuthProvider] login error:', err)
      }
      const errorMessage = err.error?.message || 'Login failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const register = async (credentials: RegisterCredentials) => {
    try {
      if (debugEnabled) {
        console.log('[AuthProvider] register called with:', credentials)
      }
      setError(null)
      const response = await authApi.register(credentials)
      if (debugEnabled) {
        console.log('[AuthProvider] register response:', response)
      }
      setUser(response.data.user)
      return { success: true }
    } catch (err: any) {
      if (debugEnabled) {
        console.error('[AuthProvider] register error:', err)
      }
      const errorMessage = err.error?.message || err.message || 'Registration failed'
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

  const refreshUser = async () => {
    try {
      if (debugEnabled) {
        console.log('[AuthProvider] refreshUser called')
      }
      const response = await authApi.getCurrentUser()
      setUser(response.data.user)
    } catch (err) {
      if (debugEnabled) {
        console.error('[AuthProvider] refreshUser error:', err)
      }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
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
