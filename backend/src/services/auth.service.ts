import * as bcrypt from 'bcrypt'
import prisma from '../config/database.js'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  user: {
    id: number
    email: string
    name: string
    role: string
    points: number
    createdAt: Date
  }
}

/**
 * Authenticate user with email and password
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
  const { email, password } = credentials

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new Error('Invalid credentials')
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    throw new Error('Invalid credentials')
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      points: user.points,
      createdAt: user.createdAt,
    },
  }
}

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      points: user.points,
      createdAt: user.createdAt,
    },
  }
}
