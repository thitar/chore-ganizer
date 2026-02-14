import prisma from '../config/database.js'

export interface CreateAssignmentData {
  choreTemplateId: number
  assignedToId: number
  dueDate: Date
  notes?: string
}

export interface UpdateAssignmentData {
  dueDate?: Date
  notes?: string
  assignedToId?: number
}

export interface AssignmentWithDetails {
  id: number
  choreTemplateId: number
  choreTemplate: {
    id: number
    title: string
    description: string | null
    points: number
    icon: string | null
    color: string | null
  }
  assignedToId: number
  assignedTo: {
    id: number
    name: string
  }
  assignedById: number
  assignedBy: {
    id: number
    name: string
  }
  dueDate: Date
  status: string
  notes: string | null
  createdAt: Date
  completedAt: Date | null
}

export interface AssignmentFilters {
  status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'ALL'
  assignedToId?: number
  dueDateFrom?: Date
  dueDateTo?: Date
}

/**
 * Get all chore assignments with optional filters
 */
export const getAllAssignments = async (
  filters?: AssignmentFilters
): Promise<AssignmentWithDetails[]> => {
  const where: any = {}

  if (filters?.status && filters.status !== 'ALL') {
    if (filters.status === 'OVERDUE') {
      // Overdue: status is PENDING and dueDate is in the past
      where.status = 'PENDING'
      where.dueDate = { lt: new Date() }
    } else {
      where.status = filters.status
    }
  }

  if (filters?.assignedToId) {
    where.assignedToId = filters.assignedToId
  }

  if (filters?.dueDateFrom || filters?.dueDateTo) {
    where.dueDate = {}
    if (filters.dueDateFrom) {
      where.dueDate.gte = filters.dueDateFrom
    }
    if (filters.dueDateTo) {
      where.dueDate.lte = filters.dueDateTo
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
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return assignments as AssignmentWithDetails[]
}

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (assignmentId: number): Promise<AssignmentWithDetails | null> => {
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
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
  })

  return assignment as AssignmentWithDetails | null
}

/**
 * Create a new chore assignment
 */
export const createAssignment = async (
  data: CreateAssignmentData,
  assignedById: number
): Promise<AssignmentWithDetails> => {
  const assignment = await prisma.choreAssignment.create({
    data: {
      choreTemplateId: data.choreTemplateId,
      assignedToId: data.assignedToId,
      assignedById,
      dueDate: data.dueDate,
      notes: data.notes,
    },
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
  })

  return assignment as AssignmentWithDetails
}

/**
 * Update a chore assignment
 */
export const updateAssignment = async (
  assignmentId: number,
  data: UpdateAssignmentData
): Promise<AssignmentWithDetails> => {
  const assignment = await prisma.choreAssignment.update({
    where: { id: assignmentId },
    data,
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
  })

  return assignment as AssignmentWithDetails
}

/**
 * Complete a chore assignment (awards points)
 */
export const completeAssignment = async (
  assignmentId: number,
  userId: number
): Promise<AssignmentWithDetails> => {
  // Get the assignment with template info
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      choreTemplate: true,
    },
  })

  if (!assignment) {
    throw new Error('Assignment not found')
  }

  if (assignment.status !== 'PENDING') {
    throw new Error('Assignment is already completed')
  }

  // Verify the user is the one assigned
  if (assignment.assignedToId !== userId) {
    throw new Error('You can only complete your own assignments')
  }

  // Use transaction to update assignment and award points
  const result = await prisma.$transaction(async (tx) => {
    // Update assignment status
    const updated = await tx.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
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
    })

    // Award points to the user
    await tx.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: assignment.choreTemplate.points,
        },
      },
    })

    return updated
  })

  return result as AssignmentWithDetails
}

/**
 * Delete a chore assignment
 */
export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  await prisma.choreAssignment.delete({
    where: { id: assignmentId },
  })
}

/**
 * Get overdue assignments
 */
export const getOverdueAssignments = async (): Promise<AssignmentWithDetails[]> => {
  const assignments = await prisma.choreAssignment.findMany({
    where: {
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
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

  return assignments as AssignmentWithDetails[]
}

/**
 * Get upcoming assignments (next N days)
 */
export const getUpcomingAssignments = async (
  days: number = 7,
  userId?: number
): Promise<AssignmentWithDetails[]> => {
  const now = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)

  const where: any = {
    status: 'PENDING',
    dueDate: {
      gte: now,
      lte: endDate,
    },
  }

  if (userId) {
    where.assignedToId = userId
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

  return assignments as AssignmentWithDetails[]
}

/**
 * Get assignments for a specific date (for calendar view)
 */
export const getAssignmentsByDate = async (
  date: Date,
  userId?: number
): Promise<AssignmentWithDetails[]> => {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const where: any = {
    dueDate: {
      gte: startOfDay,
      lte: endOfDay,
    },
  }

  if (userId) {
    where.assignedToId = userId
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

  return assignments as AssignmentWithDetails[]
}

/**
 * Get assignments for a month (for calendar view)
 */
export const getAssignmentsForMonth = async (
  year: number,
  month: number,
  userId?: number
): Promise<AssignmentWithDetails[]> => {
  const startDate = new Date(year, month - 1, 1) // Month is 0-indexed
  const endDate = new Date(year, month, 0) // Last day of month

  const where: any = {
    dueDate: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (userId) {
    where.assignedToId = userId
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

  return assignments as AssignmentWithDetails[]
}