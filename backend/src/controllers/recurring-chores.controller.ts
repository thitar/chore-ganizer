import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { RecurrenceService, RecurrenceRule } from '../services/recurrence.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * Transform recurring chore data for API response
 * Parses recurrenceRule from JSON string and formats dates
 */
function transformRecurringChore(dbRecord: any) {
  return {
    ...dbRecord,
    recurrenceRule: dbRecord.recurrenceRule ? JSON.parse(dbRecord.recurrenceRule) : null,
    startDate: dbRecord.startDate ? dbRecord.startDate.toISOString().split('T')[0] : null,
    createdAt: dbRecord.createdAt?.toISOString(),
    updatedAt: dbRecord.updatedAt?.toISOString(),
    fixedAssignees: dbRecord.fixedAssignees?.map((a: any) => a.user) || [],
    roundRobinPool: dbRecord.roundRobinPool?.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      order: p.order,
      user: p.user,
    })) || [],
  }
}

/**
 * Generate occurrences for a recurring chore within the next 30 days
 */
async function generateOccurrencesForChore(
  recurringChoreId: number,
  recurrenceRule: RecurrenceRule,
  startDate: Date,
  assignmentMode: string,
  fixedAssigneeIds: number[],
  roundRobinPoolIds: number[],
  initialRoundRobinIndex: number | null
): Promise<void> {
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  // Generate occurrence dates
  const occurrenceDates = RecurrenceService.generateOccurrences(
    recurrenceRule,
    startDate,
    endDate
  )

  // Create occurrences in database
  for (let i = 0; i < occurrenceDates.length; i++) {
    const dueDate = occurrenceDates[i]
    
    // Check if occurrence already exists
    const existing = await prisma.choreOccurrence.findUnique({
      where: {
        recurringChoreId_dueDate: {
          recurringChoreId,
          dueDate,
        },
      },
    })

    if (!existing) {
      // Calculate the correct assignee for this specific occurrence
      const occurrenceRoundRobinIndex = initialRoundRobinIndex !== null ? initialRoundRobinIndex + i : null
      const { assignedUserIds } = calculateAssignedUserIds(
        assignmentMode,
        fixedAssigneeIds,
        roundRobinPoolIds,
        occurrenceRoundRobinIndex
      )

      await prisma.choreOccurrence.create({
        data: {
          recurringChoreId,
          dueDate,
          status: 'PENDING',
          assignedUserIds: JSON.stringify(assignedUserIds),
          roundRobinIndex: occurrenceRoundRobinIndex,
        },
      })
    }
  }
}

/**
 * Calculate assigned user IDs based on assignment mode
 */
function calculateAssignedUserIds(
  assignmentMode: string,
  fixedAssigneeIds: number[],
  roundRobinPoolIds: number[],
  roundRobinIndex: number | null
): { assignedUserIds: number[]; roundRobinIndex: number | null } {
  switch (assignmentMode) {
    case 'FIXED':
      return { assignedUserIds: fixedAssigneeIds, roundRobinIndex: null }
    
    case 'ROUND_ROBIN':
      if (roundRobinPoolIds.length === 0) {
        return { assignedUserIds: [], roundRobinIndex: null }
      }
      const rrIndex = roundRobinIndex ?? 0
      const currentAssignee = roundRobinPoolIds[rrIndex % roundRobinPoolIds.length]
      return { assignedUserIds: [currentAssignee], roundRobinIndex: rrIndex }
    
    case 'MIXED':
      if (roundRobinPoolIds.length === 0) {
        return { assignedUserIds: fixedAssigneeIds, roundRobinIndex: null }
      }
      const mixedRrIndex = roundRobinIndex ?? 0
      const mixedCurrentAssignee = roundRobinPoolIds[mixedRrIndex % roundRobinPoolIds.length]
      return {
        assignedUserIds: [...fixedAssigneeIds, mixedCurrentAssignee],
        roundRobinIndex: mixedRrIndex,
      }
    
    default:
      return { assignedUserIds: [], roundRobinIndex: null }
  }
}

/**
 * POST /api/recurring-chores
 * Create a new recurring chore
 */
export const createRecurringChore = async (req: Request, res: Response) => {
  const {
    title,
    description,
    points,
    categoryId,
    recurrenceRule,
    startDate,
    assignmentMode,
    fixedAssigneeIds = [],
    roundRobinPoolIds = [],
  } = req.body

  // Validate required fields
  if (!title || !recurrenceRule || !startDate || !assignmentMode) {
    throw new AppError(
      'title, recurrenceRule, startDate, and assignmentMode are required',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Validate assignment mode
  if (!['FIXED', 'ROUND_ROBIN', 'MIXED'].includes(assignmentMode)) {
    throw new AppError(
      'assignmentMode must be FIXED, ROUND_ROBIN, or MIXED',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Validate recurrence rule
  if (!RecurrenceService.isValidRule(recurrenceRule)) {
    throw new AppError('Invalid recurrence rule format', 400, 'VALIDATION_ERROR')
  }

  // Validate assignment mode requirements
  if (assignmentMode === 'FIXED' && fixedAssigneeIds.length === 0) {
    throw new AppError(
      'FIXED assignment mode requires at least one fixed assignee',
      400,
      'VALIDATION_ERROR'
    )
  }

  if (assignmentMode === 'ROUND_ROBIN' && roundRobinPoolIds.length === 0) {
    throw new AppError(
      'ROUND_ROBIN assignment mode requires at least one pool member',
      400,
      'VALIDATION_ERROR'
    )
  }

  if (assignmentMode === 'MIXED' && fixedAssigneeIds.length === 0 && roundRobinPoolIds.length === 0) {
    throw new AppError(
      'MIXED assignment mode requires at least one fixed assignee or pool member',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Create recurring chore with relations
  const recurringChore = await prisma.recurringChore.create({
    data: {
      title,
      description,
      points: points ?? 1,
      categoryId: categoryId ?? null,
      createdById: req.user!.id,
      startDate: new Date(startDate),
      recurrenceRule: JSON.stringify(recurrenceRule),
      assignmentMode,
      isActive: true,
      fixedAssignees: {
        create: fixedAssigneeIds.map((userId: number) => ({
          userId,
        })),
      },
      roundRobinPool: {
        create: roundRobinPoolIds.map((userId: number, index: number) => ({
          userId,
          order: index,
        })),
      },
    },
    include: {
      fixedAssignees: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
      },
      roundRobinPool: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      category: true,
    },
  })

  // Generate initial occurrences for the next 30 days
  const start = new Date(startDate)
  await generateOccurrencesForChore(
    recurringChore.id,
    recurrenceRule as RecurrenceRule,
    start,
    assignmentMode,
    fixedAssigneeIds,
    roundRobinPoolIds,
    0  // Initial round-robin index
  )

  res.status(201).json({
    success: true,
    data: { recurringChore: transformRecurringChore(recurringChore) },
  })
}

/**
 * GET /api/recurring-chores
 * List all recurring chores for the family
 */
export const listRecurringChores = async (req: Request, res: Response) => {
  const { includeInactive } = req.query

  const where: any = {}

  if (includeInactive !== 'true') {
    where.isActive = true
  }

  const recurringChores = await prisma.recurringChore.findMany({
    where,
    include: {
      fixedAssignees: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
      },
      roundRobinPool: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: { recurringChores: recurringChores.map(transformRecurringChore) },
  })
}

/**
 * GET /api/recurring-chores/:id
 * Get a specific recurring chore
 */
export const getRecurringChore = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid recurring chore ID', 400, 'VALIDATION_ERROR')
  }

  const recurringChore = await prisma.recurringChore.findFirst({
    where: {
      id,
    },
    include: {
      fixedAssignees: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
      },
      roundRobinPool: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      category: true,
    },
  })

  if (!recurringChore) {
    throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
  }

  res.json({
    success: true,
    data: { recurringChore: transformRecurringChore(recurringChore) },
  })
}

/**
 * PUT /api/recurring-chores/:id
 * Update a recurring chore
 */
export const updateRecurringChore = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid recurring chore ID', 400, 'VALIDATION_ERROR')
  }

  const {
    title,
    description,
    points,
    categoryId,
    recurrenceRule,
    startDate,
    assignmentMode,
    fixedAssigneeIds,
    roundRobinPoolIds,
    isActive,
  } = req.body

  // Check if recurring chore exists
  // Note: Parents can edit any recurring chore in the family (requireParent middleware ensures only parents can access)
  const existing = await prisma.recurringChore.findFirst({
    where: {
      id,
    },
    include: {
      fixedAssignees: true,
      roundRobinPool: { orderBy: { order: 'asc' } },
    },
  })

  if (!existing) {
    throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
  }

  // Validate recurrence rule if provided
  if (recurrenceRule && !RecurrenceService.isValidRule(recurrenceRule)) {
    throw new AppError('Invalid recurrence rule format', 400, 'VALIDATION_ERROR')
  }

  // Validate assignment mode if provided
  if (assignmentMode && !['FIXED', 'ROUND_ROBIN', 'MIXED'].includes(assignmentMode)) {
    throw new AppError(
      'assignmentMode must be FIXED, ROUND_ROBIN, or MIXED',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Build update data
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (points !== undefined) updateData.points = points
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (startDate !== undefined) updateData.startDate = new Date(startDate)
  if (recurrenceRule !== undefined) updateData.recurrenceRule = JSON.stringify(recurrenceRule)
  if (assignmentMode !== undefined) updateData.assignmentMode = assignmentMode
  if (isActive !== undefined) updateData.isActive = isActive

  // Update recurring chore
  const recurringChore = await prisma.recurringChore.update({
    where: { id },
    data: updateData,
    include: {
      fixedAssignees: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
      },
      roundRobinPool: {
        include: {
          user: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      category: true,
    },
  })

  // Handle assignment changes
  if (fixedAssigneeIds !== undefined || roundRobinPoolIds !== undefined) {
    const newFixedIds = fixedAssigneeIds ?? existing.fixedAssignees.map((a: { userId: number }) => a.userId)
    const newRrPoolIds = roundRobinPoolIds ?? existing.roundRobinPool.map((p: { userId: number }) => p.userId)

    // Delete existing fixed assignees
    await prisma.recurringChoreFixedAssignee.deleteMany({
      where: { recurringChoreId: id },
    })

    // Delete existing round-robin pool
    await prisma.recurringChoreRoundRobinPool.deleteMany({
      where: { recurringChoreId: id },
    })

    // Create new fixed assignees
    if (newFixedIds.length > 0) {
      await prisma.recurringChoreFixedAssignee.createMany({
        data: newFixedIds.map((userId: number) => ({
          recurringChoreId: id,
          userId,
        })),
      })
    }

    // Create new round-robin pool
    if (newRrPoolIds.length > 0) {
      await prisma.recurringChoreRoundRobinPool.createMany({
        data: newRrPoolIds.map((userId: number, index: number) => ({
          recurringChoreId: id,
          userId,
          order: index,
        })),
      })
    }

    // Update future occurrences with new assignments
    const mode = assignmentMode ?? existing.assignmentMode

    // Get all pending occurrences and update each with correct rotation
    const now = new Date()
    const pendingOccurrences = await prisma.choreOccurrence.findMany({
      where: {
        recurringChoreId: id,
        status: 'PENDING',
        dueDate: { gte: now },
      },
      orderBy: { dueDate: 'asc' },
    })

    // Update each occurrence with the correct assignee based on its position
    for (let i = 0; i < pendingOccurrences.length; i++) {
      const occ = pendingOccurrences[i]
      const occurrenceRoundRobinIndex = i
      const { assignedUserIds } = calculateAssignedUserIds(
        mode,
        newFixedIds as number[],
        newRrPoolIds as number[],
        occurrenceRoundRobinIndex
      )

      await prisma.choreOccurrence.update({
        where: { id: occ.id },
        data: {
          assignedUserIds: JSON.stringify(assignedUserIds),
          roundRobinIndex: occurrenceRoundRobinIndex,
        },
      })
    }
  }

  // If recurrence rule changed, regenerate future occurrences
  if (recurrenceRule !== undefined) {
    // Delete future pending occurrences
    const now = new Date()
    await prisma.choreOccurrence.deleteMany({
      where: {
        recurringChoreId: id,
        status: 'PENDING',
        dueDate: { gte: now },
      },
    })

    // Get current assignments
    const fixedIds = fixedAssigneeIds ?? existing.fixedAssignees.map((a: { userId: number }) => a.userId)
    const rrPoolIds = roundRobinPoolIds ?? existing.roundRobinPool.map((p: { userId: number }) => p.userId)
    const mode = assignmentMode ?? existing.assignmentMode

    // Regenerate occurrences - use provided startDate, or existing startDate, or now
    const start = startDate ? new Date(startDate) : (existing.startDate ? new Date(existing.startDate) : now)
    await generateOccurrencesForChore(
      id,
      recurrenceRule as RecurrenceRule,
      start,
      mode,
      fixedIds,
      rrPoolIds,
      0  // Initial round-robin index
    )
  }

  res.json({
    success: true,
    data: { recurringChore: transformRecurringChore(recurringChore) },
  })
}

/**
 * DELETE /api/recurring-chores/:id
 * Soft delete a recurring chore
 */
export const deleteRecurringChore = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid recurring chore ID', 400, 'VALIDATION_ERROR')
  }

  // Check if recurring chore exists
  // Note: Parents can delete any recurring chore in the family (requireParent middleware ensures only parents can access)
  const existing = await prisma.recurringChore.findFirst({
    where: {
      id,
    },
  })

  if (!existing) {
    throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
  }

  // Soft delete by setting isActive to false
  await prisma.recurringChore.update({
    where: { id },
    data: { isActive: false },
  })

  // Optionally delete future pending occurrences
  const now = new Date()
  await prisma.choreOccurrence.deleteMany({
    where: {
      recurringChoreId: id,
      status: 'PENDING',
      dueDate: { gte: now },
    },
  })

  res.json({
    success: true,
    data: { message: 'Recurring chore deleted successfully' },
  })
}

/**
 * GET /api/recurring-chores/occurrences
 * List occurrences for the next 30 days
 */
export const listOccurrences = async (req: Request, res: Response) => {
  const { status, assignedToMe } = req.query

  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  // Build where clause
  const where: any = {
    dueDate: {
      gte: now,
      lte: endDate,
    },
    recurringChore: {
      isActive: true,
    },
  }

  // Filter by status
  if (status && ['PENDING', 'COMPLETED', 'SKIPPED'].includes(status as string)) {
    where.status = status as 'PENDING' | 'COMPLETED' | 'SKIPPED'
  }

  // Filter by assigned to current user
  if (assignedToMe === 'true') {
    // SQLite doesn't support JSON contains, so we need to fetch all and filter in memory
    const allOccurrences = await prisma.choreOccurrence.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: endDate,
        },
        recurringChore: {
          isActive: true,
        },
      },
      include: {
        recurringChore: {
          select: {
            id: true,
            title: true,
            points: true,
            icon: true,
            color: true,
          },
        },
        completedBy: {
          select: { id: true, name: true },
        },
        skippedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    // Filter in memory for assignedToMe
    const occurrences = allOccurrences.filter(occ => {
      const assignedIds = JSON.parse(occ.assignedUserIds) as number[]
      return assignedIds.includes(req.user!.id)
    })

    // Fetch assigned users for each occurrence
    const occurrencesWithUsers = await Promise.all(
      occurrences.map(async (occ) => {
        const assignedIds = JSON.parse(occ.assignedUserIds) as number[]
        const assignedUsers = await prisma.user.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, name: true },
        })
        return {
          ...occ,
          assignedUsers,
        }
      })
    )

    return res.json({
      success: true,
      data: { occurrences: occurrencesWithUsers },
    })
  }

  // Get occurrences
  const occurrences = await prisma.choreOccurrence.findMany({
    where,
    include: {
      recurringChore: {
        select: {
          id: true,
          title: true,
          points: true,
          icon: true,
          color: true,
        },
      },
      completedBy: {
        select: { id: true, name: true },
      },
      skippedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  // Fetch assigned users for each occurrence
  const occurrencesWithUsers = await Promise.all(
    occurrences.map(async (occ) => {
      const assignedIds = JSON.parse(occ.assignedUserIds) as number[]
      const assignedUsers = await prisma.user.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, name: true },
      })
      return {
        ...occ,
        assignedUsers,
      }
    })
  )

  return res.json({
    success: true,
    data: { occurrences: occurrencesWithUsers },
  })
}

/**
 * PATCH /api/recurring-chores/occurrences/:id/complete
 * Mark occurrence as completed
 */
export const completeOccurrence = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid occurrence ID', 400, 'VALIDATION_ERROR')
  }

  // Get occurrence with recurring chore
  const occurrence = await prisma.choreOccurrence.findFirst({
    where: {
      id,
    },
    include: {
      recurringChore: {
        include: {
          roundRobinPool: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  if (!occurrence) {
    throw new AppError('Occurrence not found', 404, 'NOT_FOUND')
  }

  if (occurrence.status !== 'PENDING') {
    throw new AppError(
      'Can only complete pending occurrences',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Update occurrence to completed
  const updatedOccurrence = await prisma.choreOccurrence.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedById: req.user!.id,
      pointsAwarded: occurrence.recurringChore.points,
    },
    include: {
      recurringChore: {
        select: { id: true, title: true, points: true },
      },
      completedBy: {
        select: { id: true, name: true },
      },
    },
  })

  // Handle round-robin rotation if applicable
  // When an occurrence is completed, we need to update all subsequent pending occurrences
  // to maintain the correct rotation sequence
  const { recurringChore } = occurrence
  if (
    (recurringChore.assignmentMode === 'ROUND_ROBIN' ||
      recurringChore.assignmentMode === 'MIXED') &&
    recurringChore.roundRobinPool.length > 0
  ) {
    const pool = recurringChore.roundRobinPool
    const currentIndex = occurrence.roundRobinIndex ?? 0

    // Get fixed assignees for MIXED mode
    let fixedIds: number[] = []
    if (recurringChore.assignmentMode === 'MIXED') {
      const fixedAssignees = await prisma.recurringChoreFixedAssignee.findMany({
        where: { recurringChoreId: recurringChore.id },
      })
      fixedIds = fixedAssignees.map((a: { userId: number }) => a.userId)
    }

    // Find ALL subsequent pending occurrences and update their assignments
    const now = new Date()
    const subsequentOccurrences = await prisma.choreOccurrence.findMany({
      where: {
        recurringChoreId: recurringChore.id,
        status: 'PENDING',
        dueDate: { gt: now },
      },
      orderBy: { dueDate: 'asc' },
    })

    // Update each subsequent occurrence with the correct assignee based on its position
    for (let i = 0; i < subsequentOccurrences.length; i++) {
      const occ = subsequentOccurrences[i]
      // Calculate the correct round-robin index for this occurrence
      // The first subsequent occurrence should be at currentIndex + 1, then +2, etc.
      const occurrenceIndex = currentIndex + 1 + i
      const poolIndex = occurrenceIndex % pool.length
      const nextAssigneeId = pool[poolIndex].userId

      let newAssignedIds: number[]
      if (recurringChore.assignmentMode === 'ROUND_ROBIN') {
        newAssignedIds = [nextAssigneeId]
      } else {
        // MIXED mode - keep fixed assignees and update round-robin
        newAssignedIds = [...fixedIds, nextAssigneeId]
      }

      await prisma.choreOccurrence.update({
        where: { id: occ.id },
        data: {
          assignedUserIds: JSON.stringify(newAssignedIds),
          roundRobinIndex: occurrenceIndex,
        },
      })
    }
  }

  // Award points to the user who completed the chore
  const assignedIds = JSON.parse(occurrence.assignedUserIds) as number[]
  if (assignedIds.includes(req.user!.id)) {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        points: { increment: occurrence.recurringChore.points },
      },
    })
  }

  // Fetch assigned users for response
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedIds } },
    select: { id: true, name: true },
  })

  res.json({
    success: true,
    data: {
      occurrence: {
        ...updatedOccurrence,
        assignedUsers,
      },
    },
  })
}

/**
 * PATCH /api/recurring-chores/occurrences/:id/skip
 * Skip an occurrence
 */
export const skipOccurrence = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { reason } = req.body

  if (isNaN(id)) {
    throw new AppError('Invalid occurrence ID', 400, 'VALIDATION_ERROR')
  }

  // Get occurrence
  const occurrence = await prisma.choreOccurrence.findFirst({
    where: {
      id,
    },
    include: {
      recurringChore: {
        select: { id: true, title: true, points: true },
      },
    },
  })

  if (!occurrence) {
    throw new AppError('Occurrence not found', 404, 'NOT_FOUND')
  }

  if (occurrence.status !== 'PENDING') {
    throw new AppError(
      'Can only skip pending occurrences',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Update occurrence to skipped
  const updatedOccurrence = await prisma.choreOccurrence.update({
    where: { id },
    data: {
      status: 'SKIPPED',
      skippedAt: new Date(),
      skippedById: req.user!.id,
      skipReason: reason,
    },
    include: {
      recurringChore: {
        select: { id: true, title: true, points: true },
      },
      skippedBy: {
        select: { id: true, name: true },
      },
    },
  })

  // Fetch assigned users for response
  const assignedIds = JSON.parse(occurrence.assignedUserIds) as number[]
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedIds } },
    select: { id: true, name: true },
  })

  // Note: Do NOT advance round-robin rotation when skipping

  res.json({
    success: true,
    data: {
      occurrence: {
        ...updatedOccurrence,
        assignedUsers,
      },
    },
  })
}

/**
 * PATCH /api/recurring-chores/occurrences/:id/unskip
 * Unskip a previously skipped occurrence
 */
export const unskipOccurrence = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid occurrence ID', 400, 'VALIDATION_ERROR')
  }

  // Get occurrence
  const occurrence = await prisma.choreOccurrence.findFirst({
    where: {
      id,
    },
    include: {
      recurringChore: {
        select: { id: true, title: true, points: true },
      },
    },
  })

  if (!occurrence) {
    throw new AppError('Occurrence not found', 404, 'NOT_FOUND')
  }

  if (occurrence.status !== 'SKIPPED') {
    throw new AppError(
      'Can only unskip skipped occurrences',
      400,
      'VALIDATION_ERROR'
    )
  }

  // Update occurrence back to pending
  const updatedOccurrence = await prisma.choreOccurrence.update({
    where: { id },
    data: {
      status: 'PENDING',
      skippedAt: null,
      skippedById: null,
      skipReason: null,
    },
    include: {
      recurringChore: {
        select: { id: true, title: true, points: true },
      },
    },
  })

  // Fetch assigned users for response
  const assignedIds = JSON.parse(occurrence.assignedUserIds) as number[]
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedIds } },
    select: { id: true, name: true },
  })

  res.json({
    success: true,
    data: {
      occurrence: {
        ...updatedOccurrence,
        assignedUsers,
      },
    },
  })
}