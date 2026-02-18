import * as bcrypt from 'bcrypt'
import prisma from '../config/database.js'
import { checkEmailLockout, recordFailedAttempt, resetFailedAttempts } from '../utils/lockout.js'

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

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new Error('Invalid credentials')
  }

  // Check if account is locked before attempting password verification
  const lockoutCheck = await checkEmailLockout(email)
  if (lockoutCheck.isLocked) {
    throw new Error(lockoutCheck.message)
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    // Record failed attempt
    const lockoutStatus = await recordFailedAttempt(user.id)
    if (lockoutStatus.isLocked) {
      throw new Error(`Account locked due to too many failed attempts. Try again in ${Math.ceil((lockoutStatus.lockoutUntil!.getTime() - Date.now()) / 60000)} minutes.`)
    }
    throw new Error('Invalid credentials')
  }

  // Reset failed attempts on successful login
  await resetFailedAttempts(user.id)

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
