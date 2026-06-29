import { createContext, useContext, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth.api'
import type { User } from '../api/auth.api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: Infinity,
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(['auth', 'me'], null)
    },
  })

  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      isLoading,
      error: error ?? null,
      login: (email, password) => loginMutation.mutateAsync({ email, password }),
      logout: () => logoutMutation.mutateAsync(),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
