/**
 * Login Page Tests
 *
 * Tests for the Login page component including form rendering,
 * authentication flows, registration mode, and error states.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/utils'
import type { Mock } from 'vitest'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}))
// Import after mock to get the mocked version
import { showError } from '../utils/toast'

// Mock PasswordStrengthIndicator to report full strength immediately
vi.mock('../components/common', async () => {
  const actual = await vi.importActual<typeof import('../components/common')>('../components/common')
  return {
    ...actual,
    PasswordStrengthIndicator: ({ onStrengthChange }: { onStrengthChange?: (v: number) => void }) => {
      onStrengthChange?.(100)
      return null
    },
  }
})

import { useAuth } from '../hooks'
import { Login } from './Login'

const mockUseAuth = useAuth as Mock

describe('Login', () => {
  const baseAuthMock = {
    login: vi.fn(),
    loading: false,
    error: null,
    user: null,
    isAuthenticated: false,
    isParent: false,
    isChild: false,
    logout: vi.fn(),
    register: vi.fn(),
    checkAuth: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(baseAuthMock)
  })

  it('renders login form by default', () => {
    const { container } = render(<Login />)

    expect(screen.getByText('Chore-Ganizer')).toBeDefined()
    expect(screen.getByText('Family Chore Management System')).toBeDefined()
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/password/i)).toBeDefined()
    // Buttons: Sign In tab, Register tab, Submit Sign In, Toggle mode link
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    expect(screen.getByText("Don't have an account? Register")).toBeDefined()
    const form = container.querySelector('form')
    expect(form).toBeDefined()
  })

  it('shows full-page loading when loading is true', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthMock,
      loading: true,
    })

    render(<Login />)

    expect(screen.getByText('Loading...')).toBeDefined()
    expect(screen.queryByLabelText(/email/i)).toBeNull()
  })

  it('toggles to register mode', () => {
    render(<Login />)

    fireEvent.click(screen.getByText("Don't have an account? Register"))

    expect(screen.getByLabelText(/name/i)).toBeDefined()
    expect(screen.getByLabelText('Confirm Password')).toBeDefined()
    expect(screen.getByRole('button', { name: /create account/i })).toBeDefined()
    expect(screen.getByText('Already have an account? Sign in')).toBeDefined()
  })

  it('calls login on form submit with valid credentials', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true })
    mockUseAuth.mockReturnValue({ ...baseAuthMock, login: mockLogin })
    const { container } = render(<Login />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows validation error when email is empty on submit', async () => {
    const { container } = render(<Login />)

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeDefined()
    })
  })

  it('shows validation error when password is empty on submit', async () => {
    const { container } = render(<Login />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeDefined()
    })
  })

  it('shows general error from login failure', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: false, error: 'Invalid credentials' })
    mockUseAuth.mockReturnValue({ ...baseAuthMock, login: mockLogin })
    const { container } = render(<Login />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong' },
    })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
      expect(showError).toHaveBeenCalledWith('Invalid credentials')
    })
  })

  it('calls register with name, email, and password in register mode', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true })
    mockUseAuth.mockReturnValue({ ...baseAuthMock, register: mockRegister })
    const { container } = render(<Login />)

    // Switch to register mode
    fireEvent.click(screen.getByText("Don't have an account? Register"))

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'New User' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongP@ss1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'StrongP@ss1' },
    })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'StrongP@ss1',
        name: 'New User',
      })
    })
  })
})
