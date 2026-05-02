/**
 * useAuth Hook Tests
 * 
 * Unit tests for the authentication hook.
 */

import { renderHook, render, waitFor } from '../test/utils'
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

  describe('auth:unauthorized event', () => {
    it('should clear auth state when auth:unauthorized event is dispatched', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.user).not.toBeNull()
      expect(result.current.isAuthenticated).toBe(true)

      // Dispatch the unauthorized event
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: { code: 'SESSION_EXPIRED', message: 'Session expired' },
        })
      )

      // Auth state should be cleared
      await waitFor(() => expect(result.current.user).toBeNull())
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should remove event listener on unmount', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })

      const { result, unmount } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      unmount()

      // Dispatching event after unmount should not cause errors
      expect(() => {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { code: 'SESSION_EXPIRED', message: 'Session expired' },
          })
        )
      }).not.toThrow()
    })
  })

  describe('AuthProvider children rendering', () => {
    it('should render children when not loading and user is authenticated', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })

      const { getByTestId } = render(
        <AuthProvider>
          <div data-testid="child-content">Hello</div>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(getByTestId('child-content')).toBeDefined()
      })
    })

    it('should render children even when not authenticated (no redirect overlay)', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))

      const { getByTestId } = render(
        <AuthProvider>
          <div data-testid="child-content">Hello</div>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(getByTestId('child-content')).toBeDefined()
      })
    })
  })

  describe('login flow transitions', () => {
    it('should transition isAuthenticated from false to true after successful login', async () => {
      // Initial auth check fails
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))
      mockedAuthApi.login.mockResolvedValue({ data: { user: mockUser() } })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.isAuthenticated).toBe(false)

      // Login
      await result.current.login({ email: 'test@example.com', password: 'password123' })

      // Wait for user to be set
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('should return success:false with generic error on network failure', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))
      mockedAuthApi.login.mockRejectedValue(new Error('Network Error'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(loginResult.success).toBe(false)
      // For a plain Error with no err.error property, hook falls back to 'Login failed'
      expect(loginResult.error).toBe('Login failed')
    })

    it('should clear error state on subsequent successful login attempt', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))

      const mockLogin = vi.fn()
      mockLogin
        .mockRejectedValueOnce({ error: { message: 'Invalid credentials' } })
        .mockResolvedValueOnce({ data: { user: mockUser() } })
      mockedAuthApi.login = mockLogin

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // First login fails, error should be set
      await result.current.login({ email: 'bad@example.com', password: 'wrong' })
      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials')
      })

      // Second login succeeds
      await result.current.login({ email: 'good@example.com', password: 'correct' })

      // Error should be cleared
      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('auth:unauthorized event edge cases', () => {
    it('should handle auth:unauthorized event without detail property', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.isAuthenticated).toBe(true)

      // Dispatch without detail
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))

      await waitFor(() => expect(result.current.user).toBeNull())
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should handle auth:unauthorized event with null detail', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.isAuthenticated).toBe(true)

      // Dispatch with null detail
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: null }))

      await waitFor(() => expect(result.current.user).toBeNull())
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('visibility and focus re-check branches', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should re-check auth when page becomes visible while not authenticated', async () => {
      const checkAuthCalls = vi.fn()
      mockedAuthApi.getCurrentUser
        .mockRejectedValueOnce(new Error('Not authenticated')) // initial check
        .mockRejectedValueOnce(new Error('Not authenticated')) // re-check from event

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // getCurrentUser should have been called once (initial check)
      expect(mockedAuthApi.getCurrentUser).toHaveBeenCalledTimes(1)

      // Simulate visibility change (jsdom defaults to 'visible')
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      // Now set back to visible - should trigger re-check (user is null)
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      // Should have triggered another checkAuth call
      await waitFor(() => {
        expect(mockedAuthApi.getCurrentUser).toHaveBeenCalledTimes(2)
      })
    })

    it('should not re-check auth when already authenticated and visibility changes', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // getCurrentUser should have been called once (initial check)
      const initialCalls = mockedAuthApi.getCurrentUser.mock.calls.length

      // Simulate visibility change
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      // Should NOT trigger re-check because user is already set
      expect(mockedAuthApi.getCurrentUser).toHaveBeenCalledTimes(initialCalls)
    })

    it('should re-check auth on window focus when not authenticated', async () => {
      mockedAuthApi.getCurrentUser
        .mockRejectedValueOnce(new Error('Not authenticated'))
        .mockRejectedValueOnce(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const beforeFocus = mockedAuthApi.getCurrentUser.mock.calls.length

      // Dispatch focus event
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(mockedAuthApi.getCurrentUser).toHaveBeenCalledTimes(beforeFocus + 1)
      })
    })
  })

  describe('edge case calls', () => {
    it('should handle double logout gracefully', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })
      mockedAuthApi.logout.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // Call logout twice
      await result.current.logout()
      await result.current.logout()

      // Both calls should resolve without errors
      expect(mockedAuthApi.logout).toHaveBeenCalledTimes(2)
      // Wait for state to settle
      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })
    })

    it('should handle register with network error', async () => {
      mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))
      mockedAuthApi.register.mockRejectedValue(new Error('Network failure'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const registerResult = await result.current.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test',
      })

      expect(registerResult.success).toBe(false)
      // Plain Error has err.message fallback
      expect(registerResult.error).toBe('Network failure')
    })

    it('should handle logout API error gracefully', async () => {
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: mockUser() },
      })
      mockedAuthApi.logout.mockRejectedValue(new Error('Logout failed'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // Should not throw
      await expect(result.current.logout()).resolves.toBeUndefined()
      // Wait for state to settle
      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })
    })
  })

  describe('useAuth context error', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      )
    })
  })

  describe('refreshUser', () => {
    it('should refresh user data successfully', async () => {
      const testUser = mockUser()
      mockedAuthApi.getCurrentUser.mockResolvedValue({
        data: { user: testUser },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // Call refreshUser
      await result.current.refreshUser()

      expect(result.current.user).toEqual(testUser)
    })

    it('should handle refreshUser error gracefully', async () => {
      mockedAuthApi.getCurrentUser
        .mockResolvedValueOnce({ data: { user: mockUser() } })
        .mockRejectedValueOnce(new Error('Refresh failed'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      // refreshUser should not throw
      await expect(result.current.refreshUser()).resolves.toBeUndefined()
    })
  })
})
