/**
 * useAuth Hook Tests
 * 
 * Unit tests for the authentication hook.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth'
import { authApi } from '../api'
import { mockUser, mockChild } from '../test/utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the auth API
vi.mock('../api', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}))

const mockedAuthApi = authApi as any

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  describe('initial state', () => {
    it('should start with loading true', async () => {
      mockedAuthApi.getCurrentUser.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.loading).toBe(true)
    })

    it('should have null user initially', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.user).toBeNull()
    })

    it('should not be authenticated initially', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('checkAuth', () => {
    it('should set user when auth check succeeds', async () => {
      // Create a single mock user to avoid timestamp mismatch
      const testUser = mockUser()
      const mockCurrentUser = { data: { user: testUser } }
      mockedAuthApi.getCurrentUser.mockResolvedValue(mockCurrentUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // Use the same user object for comparison
      expect(result.current.user).toEqual(testUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should set user to null when auth check fails', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = { data: { user: mockUser() } }
      mockedAuthApi.login.mockResolvedValue(mockResponse)
      mockedAuthApi.getCurrentUser.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(loginResult.success).toBe(true)
      expect(mockedAuthApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should return error on login failure', async () => {
      mockedAuthApi.login.mockRejectedValue({
        error: { message: 'Invalid credentials' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      expect(loginResult.success).toBe(false)
      expect(loginResult.error).toBe('Invalid credentials')
    })

    it('should set error state on login failure', async () => {
      mockedAuthApi.login.mockRejectedValue({
        error: { message: 'Invalid credentials' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      // Wait for the error state to be updated
      await waitFor(() => expect(result.current.error).toBe('Invalid credentials'))
    })
  })

  describe('logout', () => {
    it('should call logout API', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })
      mockedAuthApi.logout.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      await result.current.logout()

      expect(mockedAuthApi.logout).toHaveBeenCalled()
    })
  })

  describe('role checks', () => {
    it('should identify PARENT role correctly', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser({ role: 'PARENT' }) },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isParent).toBe(true)
      expect(result.current.isChild).toBe(false)
    })

    it('should identify CHILD role correctly', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockChild() },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isParent).toBe(false)
      expect(result.current.isChild).toBe(true)
    })
  })

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const mockResponse = { data: { user: mockUser() } }
      mockedAuthApi.register.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const registerResult = await result.current.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      })

      expect(registerResult.success).toBe(true)
      expect(mockedAuthApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      })
    })

    it('should return error on registration failure', async () => {
      mockedAuthApi.register.mockRejectedValue({
        error: { message: 'Email already exists' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const registerResult = await result.current.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      })

      expect(registerResult.success).toBe(false)
      expect(registerResult.error).toBe('Email already exists')
    })
  })
})
