import prisma from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'

export interface User {
  id: number
  email: string
  name: string
  role: string
  points: number
  basePocketMoney: number
  color: string | null
  familyId: string | null
  createdAt: Date
  failedLoginAttempts?: number
  lockoutUntil?: Date | null
  lockedAt?: Date | null
}

/**
 * Get all users
 */
export const getAllUsers = async (): Promise<User[]> => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return users
}

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
    },
  })

  return user
}

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<User> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND')
  }

  return user
}

/**
 * Create a new user
 */
export const createUser = async (data: {
  email: string
  password: string
  name: string
  role: string
  color: string
  basePocketMoney: number
}): Promise<User> => {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      color: data.color,
      basePocketMoney: data.basePocketMoney,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
    },
  })

  return user
}

/**
 * Get assignments assigned to a user
 */
export const getUserAssignments = async (
  userId: number,
  status?: 'pending' | 'completed' | 'overdue' | 'all'
) => {
  const where: any = {
    assignedToId: userId,
  }

  if (status && status !== 'all') {
    if (status === 'overdue') {
      where.status = 'PENDING'
      where.dueDate = { lt: new Date() }
    } else {
      where.status = status.toUpperCase()
    }
  }

  const assignments = await prisma.choreAssignment.findMany({
    where,
    include: {
      choreTemplate: {
        select: {
          id: true,
          title: true,
          description: true,
          points: true,
          icon: true,
          color: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  })

  return assignments
}

/**
 * Check if user has active assignments
 */
export const userHasActiveAssignments = async (userId: number): Promise<boolean> => {
  const count = await prisma.choreAssignment.count({
    where: {
      assignedToId: userId,
      status: 'PENDING',
    },
  })

  return count > 0
}

/**
 * Update user
 */
export const updateUser = async (userId: number, data: { name?: string; role?: string; color?: string; email?: string; basePocketMoney?: number }) => {
  // If email is being updated, check if it's already taken
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: userId }
      }
    })
    if (existingUser) {
      throw new AppError('Email is already taken', 409, 'CONFLICT')
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  return user
}

/**
 * Delete user
 */
export const deleteUser = async (userId: number): Promise<void> => {
  await prisma.user.delete({
    where: { id: userId },
  })
}

/**
 * Lock user account
 */
export const lockUser = async (userId: number): Promise<User> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      lockedAt: new Date(),
      failedLoginAttempts: 10,
      lockoutUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  return user
}

/**
 * Unlock user account
 */
export const unlockUser = async (userId: number): Promise<User> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      lockedAt: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      basePocketMoney: true,
      color: true,
      familyId: true,
      createdAt: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  return user
}
