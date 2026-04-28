import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  attachAssignedUsersToOccurrences,
  updateRoundRobinAfterCompletion,
  awardPointsForCompletion,
} from '../services/recurring-chores/occurrence-management.service.js'

const OCCURRENCE_INCLUDE = {
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
}

export const listOccurrences = async (req: Request, res: Response) => {
  const { status, assignedToMe, userId } = req.query

  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  const where: any = {
    dueDate: { gte: now, lte: endDate },
    recurringChore: { isActive: true },
  }

  if (status && ['PENDING', 'COMPLETED', 'SKIPPED'].includes(status as string)) {
    where.status = status as 'PENDING' | 'COMPLETED' | 'SKIPPED'
  }

  const filterUserId = userId ? Number(userId) : (assignedToMe === 'true' ? req.user!.id : null)

  if (filterUserId !== null) {
    const allOccurrences = await prisma.choreOccurrence.findMany({
      where: {
        dueDate: { gte: now, lte: endDate },
        recurringChore: { isActive: true },
      },
      include: OCCURRENCE_INCLUDE,
      orderBy: { dueDate: 'asc' },
    })

    const occurrences = allOccurrences.filter((occ) => {
      const assignedIds = JSON.parse(occ.assignedUserIds) as number[]
      return assignedIds.includes(filterUserId)
    })

    return res.json({
      success: true,
      data: { occurrences: await attachAssignedUsersToOccurrences(occurrences) },
    })
  }

  const occurrences = await prisma.choreOccurrence.findMany({
    where,
    include: OCCURRENCE_INCLUDE,
    orderBy: { dueDate: 'asc' },
  })

  return res.json({
    success: true,
    data: { occurrences: await attachAssignedUsersToOccurrences(occurrences) },
  })
}

export const completeOccurrence = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid occurrence ID', 400, 'VALIDATION_ERROR')
  }

  const occurrence = await prisma.choreOccurrence.findFirst({
    where: { id },
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
    throw new AppError('Can only complete pending occurrences', 400, 'VALIDATION_ERROR')
  }

  const updatedOccurrence = await prisma.choreOccurrence.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedById: req.user!.id,
      pointsAwarded: occurrence.recurringChore.points,
    },
    include: {
      recurringChore: { select: { id: true, title: true, points: true } },
      completedBy: { select: { id: true, name: true } },
    },
  })

  const { recurringChore } = occurrence
  if (
    (recurringChore.assignmentMode === 'ROUND_ROBIN' || recurringChore.assignmentMode === 'MIXED') &&
    recurringChore.roundRobinPool.length > 0
  ) {
    let fixedIds: number[] = []
    if (recurringChore.assignmentMode === 'MIXED') {
      const fixedAssignees = await prisma.recurringChoreFixedAssignee.findMany({
        where: { recurringChoreId: recurringChore.id },
      })
      fixedIds = fixedAssignees.map((a: { userId: number }) => a.userId)
    }

    await updateRoundRobinAfterCompletion(
      recurringChore.id,
      recurringChore.assignmentMode,
      occurrence.roundRobinIndex ?? 0,
      recurringChore.roundRobinPool,
      fixedIds
    )
  }

  await awardPointsForCompletion(req.user!.id, occurrence.assignedUserIds, occurrence.recurringChore.points)

  const assignedIds = JSON.parse(occurrence.assignedUserIds) as number[]
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedIds } },
    select: { id: true, name: true },
  })

  res.json({
    success: true,
    data: {
      occurrence: { ...updatedOccurrence, assignedUsers },
    },
  })
}

export const skipOccurrence = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { reason } = req.body

  if (isNaN(id)) {
    throw new AppError('Invalid occurrence ID', 400, 'VALIDATION_ERROR')
  }

  const occurrence = await prisma.choreOccurrence.findFirst({
    where: { id },
    include: {
      recurringChore: { select: { id: true, title: true, points: true } },
    },
  })

  if (!occurrence) {
    throw new AppError('Occurrence not found', 404, 'NOT_FOUND')
  }

  if (occurrence.status !== 'PENDING') {
    throw new AppError('Can only skip pending occurrences', 400, 'VALIDATION_ERROR')
  }

  const updatedOccurrence = await prisma.choreOccurrence.update({
    where: { id },
    data: {
      status: 'SKIPPED',
      skippedAt: new Date(),
      skippedById: req.user!.id,
      skipReason: reason,
    },
    include: {
      recurringChore: { select: { id: true, title: true, points: true } },
      skippedBy: { select: { id: true, name: true } },
    },
  })

  const assignedIds = JSON.parse(occurrence.assignedUserIds) as number[]
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedIds } },
    select: { id: true, name: true },
  })

  res.json({
    success: true,
    data: {
      occurrence: { ...updatedOccurrence, assignedUsers },
    },
  })
}

export const unskipOccurrence = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    throw new AppError('Invalid occurrence ID', 400, 'VALIDATION_ERROR')
  }

  const occurrence = await prisma.choreOccurrence.findFirst({
    where: { id },
    include: {
      recurringChore: { select: { id: true, title: true, points: true } },
    },
  })

  if (!occurrence) {
    throw new AppError('Occurrence not found', 404, 'NOT_FOUND')
  }

  if (occurrence.status !== 'SKIPPED') {
    throw new AppError('Can only unskip skipped occurrences', 400, 'VALIDATION_ERROR')
  }

  const updatedOccurrence = await prisma.choreOccurrence.update({
    where: { id },
    data: {
      status: 'PENDING',
      skippedAt: null,
      skippedById: null,
      skipReason: null,
    },
    include: {
      recurringChore: { select: { id: true, title: true, points: true } },
    },
  })

  const assignedIds = JSON.parse(occurrence.assignedUserIds) as number[]
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedIds } },
    select: { id: true, name: true },
  })

  res.json({
    success: true,
    data: {
      occurrence: { ...updatedOccurrence, assignedUsers },
    },
  })
}

export const triggerOccurrenceGeneration = async (req: Request, res: Response) => {
  const { generateDailyOccurrences } = await import('../jobs/occurrenceJob.js')

  try {
    const targetDateStr = req.query.date as string | undefined
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date()

    const count = await generateDailyOccurrences(targetDate)

    res.json({
      success: true,
      data: {
        message: `Generated ${count} occurrences`,
        count,
        targetDate: targetDate.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate occurrences',
        details: errorMessage,
      },
    })
  }
}
