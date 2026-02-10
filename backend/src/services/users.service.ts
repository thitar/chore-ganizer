import prisma from '../config/database.js'

export interface User {
  id: number
  email: string
  name: string
  role: string
  points: number
  createdAt: Date
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
      createdAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return users
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
      createdAt: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user
}

/**
 * Get chores assigned to a user
 */
export const getUserChores = async (
  userId: number,
  status?: 'pending' | 'completed' | 'all'
) => {
  const where: any = {
    assignedToId: userId,
  }

  if (status && status !== 'all') {
    where.status = status.toUpperCase()
  }

  const chores = await prisma.chore.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return chores
}
