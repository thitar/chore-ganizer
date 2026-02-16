import React, { useState } from 'react'
import { useAuth } from '../hooks'
import { Input, Button, Loading, PasswordStrengthIndicator } from '../components/common'

type AuthMode = 'login' | 'register'

interface ValidationErrors {
  email?: string
  password?: string
  name?: string
  general?: string
}

export const Login: React.FC = () => {
  const { login, register, loading } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [success, setSuccess] = useState('')

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required'
    }

    // Registration-specific validation
    if (mode === 'register') {
      if (!name) {
        newErrors.name = 'Name is required'
      } else if (name.length > 100) {
        newErrors.name = 'Name must be 100 characters or less'
      }

      if (passwordStrength < 100) {
        newErrors.password = 'Password does not meet all requirements'
      }

      if (password !== confirmPassword) {
        newErrors.password = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSuccess('')

    if (!validateForm()) {
      return
    }

    try {
      if (mode === 'login') {
        const result = await login({ email, password })
        if (!result.success) {
          setErrors({ general: result.error || 'Login failed' })
        }
      } else {
        const result = await register({ email, password, name })
        if (result.success) {
          setSuccess('Registration successful! You can now log in.')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          setName('')
        } else {
          // Handle validation errors from backend
          if (result.error?.includes('Validation failed')) {
            setErrors({ general: result.error })
          } else {
            setErrors({ general: result.error || 'Registration failed' })
          }
        }
      }
    } catch (err) {
      console.error('[Login] error:', err)
      setErrors({ general: 'An unexpected error occurred' })
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setErrors({})
    setSuccess('')
  }

  if (loading) {
    return <Loading text="Loading..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chore-Ganizer</h1>
          <p className="text-gray-600">Family Chore Management System</p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field (register only) */}
          {mode === 'register' && (
            <Input
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your name"
              error={errors.name}
            />
          )}

          {/* Email field */}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            error={errors.email}
          />

          {/* Password field */}
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
              error={errors.password}
            />
            {mode === 'register' && password && (
              <PasswordStrengthIndicator
                password={password}
                onStrengthChange={setPasswordStrength}
              />
            )}
          </div>

          {/* Confirm password field (register only) */}
          {mode === 'register' && (
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              error={password !== confirmPassword && confirmPassword ? 'Passwords do not match' : undefined}
            />
          )}

          {/* General error message */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Toggle link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
