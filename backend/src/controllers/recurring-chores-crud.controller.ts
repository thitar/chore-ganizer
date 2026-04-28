import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { RecurrenceService, RecurrenceRule } from '../services/recurrence.service.js'
import { AppError } from '../middleware/errorHandler.js'
import { generateOccurrencesForChore } from '../services/recurring-chores/occurrence.service.js'
import { transformRecurringChore } from '../services/recurring-chores/transform.service.js'
import { recurrenceRuleSchema } from '../schemas/validation.schemas.js'
import {
  RECURRING_CHORE_INCLUDE,
  updateRecurringChoreAssignments,
  regenerateFutureOccurrences,
} from '../services/recurring-chores/recurring-chore-management.service.js'

function validateRecurrenceRule(rule: unknown): void {
  const zodResult = recurrenceRuleSchema.safeParse(rule)
  if (!zodResult.success) {
    throw new AppError('Invalid recurrence rule format', 400, 'VALIDATION_ERROR')
  }
  if (!RecurrenceService.isValidRule(rule as RecurrenceRule)) {
    throw new AppError('Invalid recurrence rule format', 400, 'VALIDATION_ERROR')
  }
}

function validateAssignmentMode(mode: unknown): void {
  if (!['FIXED', 'ROUND_ROBIN', 'MIXED'].includes(mode as string)) {
    throw new AppError(
      'assignmentMode must be FIXED, ROUND_ROBIN, or MIXED',
      400,
      'VALIDATION_ERROR'
    )
  }
}

function validateId(id: number): void {
  if (isNaN(id)) {
    throw new AppError('Invalid recurring chore ID', 400, 'VALIDATION_ERROR')
  }
}

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

  if (!title || !recurrenceRule || !startDate || !assignmentMode) {
    throw new AppError(
      'title, recurrenceRule, startDate, and assignmentMode are required',
      400,
      'VALIDATION_ERROR'
    )
  }
  validateAssignmentMode(assignmentMode)
  validateRecurrenceRule(recurrenceRule)
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
        create: fixedAssigneeIds.map((userId: number) => ({ userId })),
      },
      roundRobinPool: {
        create: roundRobinPoolIds.map((userId: number, index: number) => ({
          userId,
          order: index,
        })),
      },
    },
    include: RECURRING_CHORE_INCLUDE,
  })

  await generateOccurrencesForChore(
    recurringChore.id,
    recurrenceRule as RecurrenceRule,
    new Date(startDate),
    assignmentMode,
    fixedAssigneeIds,
    roundRobinPoolIds,
    0
  )

  res.status(201).json({
    success: true,
    data: { recurringChore: transformRecurringChore(recurringChore) },
  })
}

export const listRecurringChores = async (req: Request, res: Response) => {
  const { includeInactive } = req.query
  const where: any = {}
  if (includeInactive !== 'true') {
    where.isActive = true
  }

  const recurringChores = await prisma.recurringChore.findMany({
    where,
    include: RECURRING_CHORE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: { recurringChores: recurringChores.map(transformRecurringChore) },
  })
}

export const getRecurringChore = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  validateId(id)

  const recurringChore = await prisma.recurringChore.findFirst({
    where: { id },
    include: RECURRING_CHORE_INCLUDE,
  })

  if (!recurringChore) {
    throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
  }

  res.json({
    success: true,
    data: { recurringChore: transformRecurringChore(recurringChore) },
  })
}

export const updateRecurringChore = async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  validateId(id)

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

  const existing = await prisma.recurringChore.findFirst({
    where: { id },
    include: {
      fixedAssignees: true,
      roundRobinPool: { orderBy: { order: 'asc' } },
    },
  })
  if (!existing) {
    throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
  }

  if (recurrenceRule) {
    validateRecurrenceRule(recurrenceRule)
  }

  if (assignmentMode) {
    validateAssignmentMode(assignmentMode)
  }
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (points !== undefined) updateData.points = points
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (startDate !== undefined) updateData.startDate = new Date(startDate)
  if (recurrenceRule !== undefined) updateData.recurrenceRule = JSON.stringify(recurrenceRule)
  if (assignmentMode !== undefined) updateData.assignmentMode = assignmentMode
  if (isActive !== undefined) updateData.isActive = isActive

  const recurringChore = await prisma.recurringChore.update({
    where: { id },
    data: updateData,
    include: RECURRING_CHORE_INCLUDE,
  })

  if (fixedAssigneeIds !== undefined || roundRobinPoolIds !== undefined) {
    await updateRecurringChoreAssignments(
      id,
      fixedAssigneeIds,
      roundRobinPoolIds,
      assignmentMode,
      existing
    )
  }

  if (recurrenceRule !== undefined) {
    await regenerateFutureOccurrences(
      id,
      recurrenceRule as RecurrenceRule,
      startDate,
      existing.startDate,
      fixedAssigneeIds,
      roundRobinPoolIds,
      assignmentMode,
      existing
    )
  }

  res.json({
    success: true,
    data: { recurringChore: transformRecurringChore(recurringChore) },
  })
}

export const deleteRecurringChore = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  validateId(id)

  const existing = await prisma.recurringChore.findFirst({
    where: { id },
  })

  if (!existing) {
    throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
  }

  await prisma.recurringChore.update({
    where: { id },
    data: { isActive: false },
  })

  res.json({
    success: true,
    data: { message: 'Recurring chore deleted successfully' },
  })
}

export const toggleRecurringChoreActive = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { isActive } = req.body

  validateId(id)

  try {
    const updated = await prisma.recurringChore.update({
      where: { id },
      data: { isActive },
      include: {
        category: true,
        fixedAssignees: true,
        roundRobinPool: {
          include: { user: true },
        },
      },
    })

    res.json({
      success: true,
      data: { recurringChore: transformRecurringChore(updated) },
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new AppError('Recurring chore not found', 404, 'NOT_FOUND')
    }
    throw error
  }
}
