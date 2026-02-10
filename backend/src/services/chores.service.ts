import prisma from '../config/database.js'

export interface CreateChoreData {
  title: string
  description?: string
  points: number
  assignedToId: number
}

export interface UpdateChoreData {
  title?: string
  description?: string
  points?: number
  assignedToId?: number
}

export interface ChoreWithUser {
  id: number
  title: string
  description: string | null
  points: number
  status: string
  assignedToId: number
  assignedTo: {
    id: number
    name: string
  }
  createdAt: Date
  completedAt: Date | null
}

/**
 * Get all chores with optional filters
 */
export const getAllChores = async (filters?: {
  status?: 'pending' | 'completed' | 'all'
  assignedToId?: number
}): Promise<ChoreWithUser[]> => {
  const where: any = {}

  if (filters?.status && filters.status !== 'all') {
    where.status = filters.status.toUpperCase()
  }

  if (filters?.assignedToId) {
    where.assignedToId = filters.assignedToId
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

  return chores as ChoreWithUser[]
}

/**
 * Get chore by ID
 */
export const getChoreById = async (choreId: number): Promise<ChoreWithUser> => {
  const chore = await prisma.chore.findUnique({
    where: { id: choreId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!chore) {
    throw new Error('Chore not found')
  }

  return chore as ChoreWithUser
}

/**
 * Create a new chore
 */
export const createChore = async (data: CreateChoreData): Promise<ChoreWithUser> => {
  // Verify assigned user exists
  const user = await prisma.user.findUnique({
    where: { id: data.assignedToId },
  })

  if (!user) {
    throw new Error('Assigned user not found')
  }

  const chore = await prisma.chore.create({
    data,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return chore as ChoreWithUser
}

/**
 * Update an existing chore
 */
export const updateChore = async (
  choreId: number,
  data: UpdateChoreData
): Promise<ChoreWithUser> => {
  // Verify chore exists
  const existingChore = await prisma.chore.findUnique({
    where: { id: choreId },
  })

  if (!existingChore) {
    throw new Error('Chore not found')
  }

  // If changing assigned user, verify new user exists
  if (data.assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: data.assignedToId },
    })

    if (!user) {
      throw new Error('Assigned user not found')
    }
  }

  const chore = await prisma.chore.update({
    where: { id: choreId },
    data,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return chore as ChoreWithUser
}

/**
 * Delete a chore
 */
export const deleteChore = async (choreId: number): Promise<void> => {
  // Verify chore exists
  const existingChore = await prisma.chore.findUnique({
    where: { id: choreId },
  })

  if (!existingChore) {
    throw new Error('Chore not found')
  }

  await prisma.chore.delete({
    where: { id: choreId },
  })
}

/**
 * Complete a chore and award points
 */
export const completeChore = async (
  choreId: number,
  userId: number
): Promise<{ chore: ChoreWithUser; pointsAwarded: number; userPoints: number }> => {
  // Verify chore exists and is pending
  const chore = await prisma.chore.findUnique({
    where: { id: choreId },
  })

  if (!chore) {
    throw new Error('Chore not found')
  }

  if (chore.status !== 'PENDING') {
    throw new Error('Chore is already completed')
  }

  if (chore.assignedToId !== userId) {
    throw new Error('You can only complete your assigned chores')
  }

  // Update chore status
  const updatedChore = await prisma.chore.update({
    where: { id: choreId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Award points to user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: chore.points,
      },
    },
  })

  return {
    chore: updatedChore as ChoreWithUser,
    pointsAwarded: chore.points,
    userPoints: updatedUser.points,
  }
}
