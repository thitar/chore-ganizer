import prisma from '../config/database.js'

interface DateRange {
  startDate: Date
  endDate: Date
}

interface ChoreCompletionStats {
  totalAssigned: number
  completed: number
  pending: number
  overdue: number
  completionRate: number
}

interface DailyPointData {
  date: string
  totalPoints: number
  count: number
}

interface ActivityFeedItem {
  type: string
  user: string
  choreTitle: string
  points: number
  date: Date
}

interface FamilyStatistics {
  familyMembers: Array<{
    id: number
    name: string
    role: string
  }>
  choreStats: ChoreCompletionStats
  pointTrends: DailyPointData[]
  activityFeed: ActivityFeedItem[]
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

interface ChildStatistics {
  totalAssigned: number
  completed: number
  completionRate: number
  currentPoints: number
  pointsEarned: number
  pointsSpent: number
  pointHistory: Array<{
    id: number
    type: string
    amount: number
    description: string | null
    createdAt: Date
  }>
}

/**
 * Get family statistics for a given family within a date range
 */
export const getFamilyStatistics = async (
  familyId: string,
  dateRange?: DateRange
): Promise<FamilyStatistics> => {
  const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const endDate = dateRange?.endDate || new Date()

  // Get all family members
  const familyMembers = await prisma.user.findMany({
    where: { familyId },
    select: { id: true, name: true, role: true },
  })

  // Get chore completion stats
  const choreStats = await getChoreCompletionStats(familyId, startDate, endDate)

  // Get point trends
  const pointTrends = await getPointTrends(familyId, startDate, endDate)

  // Get activity feed
  const activityFeed = await getActivityFeed(familyId, startDate, endDate)

  return {
    familyMembers,
    choreStats,
    pointTrends,
    activityFeed,
    dateRange: { startDate, endDate },
  }
}

/**
 * Get chore completion statistics for a family
 * Optimized to use a single aggregation query instead of 4 separate queries
 */
const getChoreCompletionStats = async (
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<ChoreCompletionStats> => {
  // Use a single aggregation query with grouping by status
  const statusCounts = await prisma.choreAssignment.groupBy({
    by: ['status'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      assignedTo: { familyId },
    },
    _count: true,
  })

  // Convert the array to a map for easy lookup
  const countMap = new Map(statusCounts.map((item) => [item.status, item._count]))

  const totalAssigned = statusCounts.reduce((sum, item) => sum + item._count, 0)
  const completed = countMap.get('COMPLETED') || 0
  const pending = countMap.get('PENDING') || 0

  // Overdue chores still need a separate query due to the date comparison
  const overdue = await prisma.choreAssignment.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'PENDING',
      dueDate: { lt: new Date() },
      assignedTo: { familyId },
    },
  })

  return {
    totalAssigned,
    completed,
    pending,
    overdue,
    completionRate: totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0,
  }
}

/**
 * Get daily point trends for a family
 */
const getPointTrends = async (
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyPointData[]> => {
  // Get daily point totals
  const transactions = await prisma.pointTransaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      user: { familyId },
    },
    select: {
      amount: true,
      createdAt: true,
      userId: true,
    },
  })

  // Group by date
  const dailyPoints = transactions.reduce((acc, t) => {
    const date = t.createdAt.toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { date, totalPoints: 0, count: 0 }
    }
    acc[date].totalPoints += t.amount
    acc[date].count += 1
    return acc
  }, {} as Record<string, DailyPointData>)

  return Object.values(dailyPoints).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get activity feed for a family
 */
const getActivityFeed = async (
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<ActivityFeedItem[]> => {
  // Recent chore completions
  const recentCompletions = await prisma.choreAssignment.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'COMPLETED',
      assignedTo: { familyId },
    },
    include: {
      assignedTo: { select: { name: true } },
      choreTemplate: { select: { title: true, points: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 20,
  })

  return recentCompletions.map((c) => ({
    type: 'CHORE_COMPLETED',
    user: c.assignedTo.name,
    choreTitle: c.choreTemplate.title,
    points: c.choreTemplate.points,
    date: c.completedAt || c.createdAt,
  }))
}

/**
 * Get statistics for a specific child
 */
export const getChildStatistics = async (
  childId: number,
  dateRange?: DateRange
): Promise<ChildStatistics> => {
  const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const endDate = dateRange?.endDate || new Date()

  // Get child's chore stats
  const totalAssigned = await prisma.choreAssignment.count({
    where: { assignedToId: childId, createdAt: { gte: startDate, lte: endDate } },
  })

  const completed = await prisma.choreAssignment.count({
    where: {
      assignedToId: childId,
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  // Get point history
  const pointHistory = await prisma.pointTransaction.findMany({
    where: { userId: childId, createdAt: { gte: startDate, lte: endDate } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      createdAt: true,
    },
  })

  // Current balance
  const user = await prisma.user.findUnique({
    where: { id: childId },
    select: { points: true },
  })

  return {
    totalAssigned,
    completed,
    completionRate: totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0,
    currentPoints: user?.points || 0,
    pointsEarned: pointHistory.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    pointsSpent: Math.abs(
      pointHistory.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    ),
    pointHistory,
  }
}

export default { getFamilyStatistics, getChildStatistics }
