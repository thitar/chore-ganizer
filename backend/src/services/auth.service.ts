import * as bcrypt from 'bcrypt'
import prisma from '../config/database.js'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
  role: string
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
 * Register a new user
 */
export const register = async (credentials: RegisterCredentials): Promise<AuthResult> => {
  const { email, password, name, role } = credentials

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role || 'CHILD',
      points: 0,
    },
  })

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
