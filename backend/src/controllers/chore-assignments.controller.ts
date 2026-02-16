import { Request, Response } from 'express'
import * as assignmentsService from '../services/chore-assignments.service.js'
import * as templatesService from '../services/chore-templates.service.js'
import * as notificationsService from '../services/notifications.service.js'
import * as notificationSettingsService from '../services/notification-settings.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/chore-assignments
 * Get all chore assignments with optional filters
 */
export const getAssignments = async (req: Request, res: Response) => {
  const { status, assignedToId, dueDateFrom, dueDateTo } = req.query

  const filters: assignmentsService.AssignmentFilters = {}

  if (status && ['PENDING', 'COMPLETED', 'OVERDUE', 'ALL'].includes(status as string)) {
    filters.status = status as assignmentsService.AssignmentFilters['status']
  }

  if (assignedToId) {
    filters.assignedToId = Number(assignedToId)
  }

  if (dueDateFrom) {
    filters.dueDateFrom = new Date(dueDateFrom as string)
  }

  if (dueDateTo) {
    filters.dueDateTo = new Date(dueDateTo as string)
  }

  const assignments = await assignmentsService.getAllAssignments(filters)

  res.json({
    success: true,
    data: { assignments },
  })
}

/**
 * GET /api/chore-assignments/upcoming
 * Get upcoming assignments (next N days)
 */
export const getUpcoming = async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 7
  const userId = req.query.userId ? Number(req.query.userId) : undefined

  const assignments = await assignmentsService.getUpcomingAssignments(days, userId)

  res.json({
    success: true,
    data: { assignments },
  })
}

/**
 * GET /api/chore-assignments/overdue
 * Get overdue assignments
 */
export const getOverdue = async (_req: Request, res: Response) => {
  const assignments = await assignmentsService.getOverdueAssignments()

  res.json({
    success: true,
    data: { assignments },
  })
}

/**
 * GET /api/chore-assignments/calendar
 * Get assignments for a month (calendar view)
 */
export const getCalendar = async (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  const month = Number(req.query.month) || new Date().getMonth() + 1
  const userId = req.query.userId ? Number(req.query.userId) : undefined

  const assignments = await assignmentsService.getAssignmentsForMonth(year, month, userId)

  res.json({
    success: true,
    data: { assignments, year, month },
  })
}

/**
 * GET /api/chore-assignments/:id
 * Get a single chore assignment
 */
export const getAssignment = async (req: Request, res: Response) => {
  const assignmentId = Number(req.params.id)

  if (isNaN(assignmentId)) {
    throw new AppError('Invalid assignment ID', 400, 'VALIDATION_ERROR')
  }

  const assignment = await assignmentsService.getAssignmentById(assignmentId)

  if (!assignment) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND')
  }

  res.json({
    success: true,
    data: { assignment },
  })
}

/**
 * POST /api/chore-assignments
 * Create a new chore assignment
 */
export const createAssignment = async (req: Request, res: Response) => {
  const { choreTemplateId, assignedToId, dueDate, notes } = req.body

  if (!choreTemplateId || !assignedToId || !dueDate) {
    throw new AppError('choreTemplateId, assignedToId, and dueDate are required', 400, 'VALIDATION_ERROR')
  }

  // Verify template exists
  const template = await templatesService.getTemplateById(choreTemplateId)
  if (!template) {
    throw new AppError('Chore template not found', 404, 'NOT_FOUND')
  }

  const assignment = await assignmentsService.createAssignment(
    { choreTemplateId, assignedToId, dueDate: new Date(dueDate), notes },
    req.user!.id
  )

  // Create notification for assigned user
  await notificationsService.createNotification({
    userId: assignedToId,
    type: 'CHORE_ASSIGNED',
    title: 'New Chore Assigned',
    message: `You have been assigned: ${template.title}`,
  })

  // Send push notification
  await notificationSettingsService.sendPushNotification(
    assignedToId,
    'CHORE_ASSIGNED',
    {
      choreTitle: template.title,
      dueDate: new Date(dueDate).toLocaleDateString(),
    }
  )

  res.status(201).json({
    success: true,
    data: { assignment },
  })
}

/**
 * PUT /api/chore-assignments/:id
 * Update a chore assignment (reschedule, reassign)
 */
export const updateAssignment = async (req: Request, res: Response) => {
  const assignmentId = Number(req.params.id)

  if (isNaN(assignmentId)) {
    throw new AppError('Invalid assignment ID', 400, 'VALIDATION_ERROR')
  }

  const { dueDate, notes, assignedToId } = req.body

  // Check assignment exists
  const existing = await assignmentsService.getAssignmentById(assignmentId)
  if (!existing) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND')
  }

  const updateData: assignmentsService.UpdateAssignmentData = {}
  if (dueDate) updateData.dueDate = new Date(dueDate)
  if (notes !== undefined) updateData.notes = notes
  if (assignedToId) updateData.assignedToId = assignedToId

  const assignment = await assignmentsService.updateAssignment(assignmentId, updateData)

  res.json({
    success: true,
    data: { assignment },
  })
}

/**
 * POST /api/chore-assignments/:id/complete
 * Complete a chore assignment (awards points)
 * Body: { status?: 'COMPLETED' | 'PARTIALLY_COMPLETE', customPoints?: number }
 */
export const completeAssignment = async (req: Request, res: Response) => {
  const assignmentId = Number(req.params.id)
  const { status, customPoints } = req.body

  if (isNaN(assignmentId)) {
    throw new AppError('Invalid assignment ID', 400, 'VALIDATION_ERROR')
  }

  // Check assignment exists
  const existing = await assignmentsService.getAssignmentById(assignmentId)
  if (!existing) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND')
  }

  // Determine if the user is a parent
  const isParent = req.user?.role === 'PARENT'

  const assignment = await assignmentsService.completeAssignment(assignmentId, req.user!.id, {
    status: status || 'COMPLETED',
    customPoints: customPoints,
    isParent
  })

  // Calculate points that were awarded
  let pointsAwarded: number
  if (customPoints !== undefined) {
    pointsAwarded = customPoints
  } else if (status === 'PARTIALLY_COMPLETE') {
    pointsAwarded = Math.floor(existing.choreTemplate.points / 2)
  } else {
    pointsAwarded = existing.choreTemplate.points
  }

  // Create notification for points earned
  await notificationsService.createNotification({
    userId: existing.assignedToId,
    type: 'POINTS_EARNED',
    title: status === 'PARTIALLY_COMPLETE' ? 'Partial Points Earned!' : 'Points Earned!',
    message: `You earned ${pointsAwarded} points for completing: ${existing.choreTemplate.title}`,
  })

  // Send push notification for points earned
  await notificationSettingsService.sendPushNotification(
    existing.assignedToId,
    'POINTS_EARNED',
    {
      choreTitle: existing.choreTemplate.title,
      points: pointsAwarded,
    }
  )

  res.json({
    success: true,
    data: { assignment, pointsAwarded },
  })
}

/**
 * DELETE /api/chore-assignments/:id
 * Delete a chore assignment
 */
export const deleteAssignment = async (req: Request, res: Response) => {
  const assignmentId = Number(req.params.id)

  if (isNaN(assignmentId)) {
    throw new AppError('Invalid assignment ID', 400, 'VALIDATION_ERROR')
  }

  // Check assignment exists
  const existing = await assignmentsService.getAssignmentById(assignmentId)
  if (!existing) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND')
  }

  await assignmentsService.deleteAssignment(assignmentId)

  res.json({
    success: true,
    data: { message: 'Assignment deleted successfully' },
  })
}
