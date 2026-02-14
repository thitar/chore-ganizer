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
 * Update user
 */
export const updateUser = async (userId: number, data: { name?: string; role?: string }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      points: true,
      createdAt: true,
    },
  })

  return user
}
