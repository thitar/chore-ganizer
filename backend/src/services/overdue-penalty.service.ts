import prisma from '../config/database.js'
import { getOrCreateSettings, sendPushNotification } from './notification-settings.service.js'

/**
 * Get all parents in the system
 */
export const getAllParents = async () => {
  return prisma.user.findMany({
    where: { role: 'PARENT' },
  })
}

/**
 * Get parent notification settings (first parent with settings, or create default)
 * For family-wide settings, we use the first parent's settings
 */
export const getFamilyPenaltySettings = async () => {
  const parents = await getAllParents()
  if (parents.length === 0) {
    return null
  }
  
  // Use the first parent's settings for family-wide penalty settings
  const settings = await getOrCreateSettings(parents[0].id)
  return {
    overduePenaltyEnabled: settings.overduePenaltyEnabled,
    overduePenaltyMultiplier: settings.overduePenaltyMultiplier,
    notifyParentOnOverdue: settings.notifyParentOnOverdue,
  }
}

/**
 * Find all overdue chores that haven't had a penalty applied yet
 */
export const findOverdueChoresWithoutPenalty = async () => {
  const now = new Date()
  
  return prisma.choreAssignment.findMany({
    where: {
      dueDate: { lt: now },
      status: 'PENDING',
      penaltyApplied: false,
    },
    include: {
      choreTemplate: true,
      assignedTo: true,
      assignedBy: true,
    },
  })
}

/**
 * Apply penalty to a user for an overdue chore
 * Returns the penalty points deducted (negative number)
 */
export const applyOverduePenalty = async (
  assignmentId: number,
  multiplier: number
): Promise<{ penaltyPoints: number; userId: number; choreTitle: string }> => {
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: { choreTemplate: true, assignedTo: true },
  })
  
  if (!assignment) {
    throw new Error(`Assignment ${assignmentId} not found`)
  }
  
  // Calculate penalty (negative points)
  const penaltyPoints = -Math.abs(assignment.choreTemplate.points * multiplier)
  
  // Update user's points
  await prisma.user.update({
    where: { id: assignment.assignedToId },
    data: {
      points: {
        increment: penaltyPoints,
      },
    },
  })
  
  // Mark assignment as penalty applied
  await prisma.choreAssignment.update({
    where: { id: assignmentId },
    data: {
      penaltyApplied: true,
      penaltyPoints: penaltyPoints,
    },
  })
  
  return {
    penaltyPoints,
    userId: assignment.assignedToId,
    choreTitle: assignment.choreTemplate.title,
  }
}

/**
 * Send notification to parent about overdue chore
 */
export const notifyParentOfOverdue = async (
  parentId: number,
  context: {
    childName: string
    choreTitle: string
    daysOverdue: number
    penaltyPoints: number
  }
): Promise<boolean> => {
  const settings = await getOrCreateSettings(parentId)
  
  if (!settings.notifyParentOnOverdue) {
    return false
  }
  
  // Check if parent has ntfy configured
  const defaults = {
    ntfyTopic: process.env.NTFY_DEFAULT_TOPIC || null,
  }
  
  const ntfyTopic = settings.ntfyTopic || defaults.ntfyTopic
  
  if (!ntfyTopic) {
    return false
  }
  
  return sendPushNotification(parentId, 'CHORE_OVERDUE', {
    userName: context.childName,
    choreTitle: context.choreTitle,
    daysOverdue: context.daysOverdue,
    points: context.penaltyPoints,
  })
}

/**
 * Send notification to child about penalty applied
 */
export const notifyChildOfPenalty = async (
  userId: number,
  context: {
    choreTitle: string
    penaltyPoints: number
  }
): Promise<boolean> => {
  return sendPushNotification(userId, 'POINTS_EARNED', {
    choreTitle: context.choreTitle,
    points: context.penaltyPoints,
    totalPoints: 0, // We don't have the updated total here
  })
}

/**
 * Calculate days overdue
 */
export const calculateDaysOverdue = (dueDate: Date): number => {
  const now = new Date()
  const diffTime = now.getTime() - dueDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays)
}

/**
 * Process all overdue chores - apply penalties and send notifications
 * This is the main function to call from a scheduled job or API endpoint
 */
export const processOverdueChores = async (): Promise<{
  processed: number
  penalties: Array<{
    assignmentId: number
    userId: number
    choreTitle: string
    penaltyPoints: number
  }>
  errors: Array<{
    assignmentId: number
    error: string
  }>
}> => {
  const result = {
    processed: 0,
    penalties: [] as Array<{
      assignmentId: number
      userId: number
      choreTitle: string
      penaltyPoints: number
    }>,
    errors: [] as Array<{
      assignmentId: number
      error: string
    }>,
  }
  
  // Get family penalty settings
  const settings = await getFamilyPenaltySettings()
  
  if (!settings || !settings.overduePenaltyEnabled) {
    console.log('[OverduePenalty] Penalty system disabled or no parents found')
    return result
  }
  
  // Find overdue chores without penalty
  const overdueChores = await findOverdueChoresWithoutPenalty()
  
  console.log(`[OverduePenalty] Found ${overdueChores.length} overdue chores to process`)
  
  for (const assignment of overdueChores) {
    try {
      // Apply penalty
      const penalty = await applyOverduePenalty(
        assignment.id,
        settings.overduePenaltyMultiplier
      )
      
      result.penalties.push({
        assignmentId: assignment.id,
        userId: penalty.userId,
        choreTitle: penalty.choreTitle,
        penaltyPoints: penalty.penaltyPoints,
      })
      
      // Calculate days overdue
      const daysOverdue = calculateDaysOverdue(assignment.dueDate)
      
      // Notify parent
      const parents = await getAllParents()
      for (const parent of parents) {
        await notifyParentOfOverdue(parent.id, {
          childName: assignment.assignedTo.name,
          choreTitle: assignment.choreTemplate.title,
          daysOverdue,
          penaltyPoints: penalty.penaltyPoints,
        })
      }
      
      // Notify child
      await notifyChildOfPenalty(assignment.assignedToId, {
        choreTitle: assignment.choreTemplate.title,
        penaltyPoints: penalty.penaltyPoints,
      })
      
      result.processed++
    } catch (error) {
      console.error(`[OverduePenalty] Error processing assignment ${assignment.id}:`, error)
      result.errors.push({
        assignmentId: assignment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return result
}

/**
 * Get penalty status for a specific assignment
 */
export const getAssignmentPenaltyStatus = async (assignmentId: number) => {
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      dueDate: true,
      status: true,
      penaltyApplied: true,
      penaltyPoints: true,
    },
  })
  
  if (!assignment) {
    return null
  }
  
  const isOverdue = new Date() > assignment.dueDate && assignment.status === 'PENDING'
  const daysOverdue = isOverdue ? calculateDaysOverdue(assignment.dueDate) : 0
  
  return {
    ...assignment,
    isOverdue,
    daysOverdue,
  }
}