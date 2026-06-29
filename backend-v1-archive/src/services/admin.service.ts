import prisma from '../config/database.js'
import { checkDatabase, checkMemory, checkDisk, getUptime } from './health.service.js'
import { getAuditLogs } from './audit.service.js'
import { getUserRequestCounts } from '../middleware/rateLimiter.js'

// ============================================
// Dashboard Types
// ============================================

export interface HealthSection {
  status: 'ok' | 'degraded' | 'error'
  database: 'connected' | 'error'
  uptime: number
}

export interface ChoreStatsSection {
  totalAssigned: number
  completed: number
  pending: number
  overdue: number
  completionRate: number
  memberBreakdown: Array<{
    userId: number
    name: string
    totalAssigned: number
    completed: number
    completionRate: number
  }>
}

export interface PointSummarySection {
  memberBalances: Array<{
    userId: number
    name: string
    balance: number
  }>
  totalEarnedThisPeriod: number
  totalSpentThisPeriod: number
}

export interface ActivitySection {
  entries: Array<{
    id: number
    action: string
    entityType: string
    userId: number
    timestamp: Date
    details: string | null
  }>
  total: number
}

export interface RateLimitSection {
  perUser: Array<{
    userId: number
    count: number
    windowStart: string
  }>
}

export interface DashboardData {
  health: HealthSection | null
  choreStats: ChoreStatsSection | null
  pointSummary: PointSummarySection | null
  activity: ActivitySection | null
  rateLimits: RateLimitSection | null
}

// ============================================
// Health Section
// ============================================

/**
 * Get a focused health subset for the admin dashboard.
 * Delegates to health.service.ts sub-checks and derives overall status.
 */
export async function getHealth(): Promise<HealthSection> {
  const dbResult = await checkDatabase()
  const memoryResult = checkMemory()
  const diskResult = checkDisk()

  const isHealthy = dbResult.status === 'connected'
  const isDegraded = memoryResult.status !== 'ok' || diskResult.status !== 'ok'

  return {
    status: isHealthy ? (isDegraded ? 'degraded' : 'ok') : 'error',
    database: dbResult.status,
    uptime: getUptime(),
  }
}

// ============================================
// Chore Stats Section
// ============================================

/**
 * Get aggregated chore statistics for a family.
 * Uses Prisma groupBy for efficient querying — no N+1 loops.
 */
export async function getChoreStats(familyId: string): Promise<ChoreStatsSection> {
  const members = await prisma.user.findMany({
    where: { familyId },
    select: { id: true, name: true },
  })

  // Single query for per-member stats using groupBy
  const memberStats = await prisma.choreAssignment.groupBy({
    by: ['userId', 'status'],
    where: {
      assignedTo: { familyId },
    },
    _count: true,
  })

  // Aggregate into per-user maps
  const userStatsMap = new Map<number, { completed: number; pending: number; total: number }>()
  let totalCompleted = 0
  let totalPending = 0
  let totalAssigned = 0

  for (const stat of memberStats) {
    if (!userStatsMap.has(stat.userId)) {
      userStatsMap.set(stat.userId, { completed: 0, pending: 0, total: 0 })
    }
    const entry = userStatsMap.get(stat.userId)!
    entry.total += stat._count
    if (stat.status === 'COMPLETED') entry.completed += stat._count
    else if (stat.status === 'PENDING') entry.pending += stat._count

    totalAssigned += stat._count
    if (stat.status === 'COMPLETED') totalCompleted += stat._count
    else if (stat.status === 'PENDING') totalPending += stat._count
  }

  // Overdue count
  const overdue = await prisma.choreAssignment.count({
    where: {
      assignedTo: { familyId },
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
  })

  const memberBreakdown = members.map((m) => {
    const stats = userStatsMap.get(m.id) || { completed: 0, pending: 0, total: 0 }
    return {
      userId: m.id,
      name: m.name,
      totalAssigned: stats.total,
      completed: stats.completed,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }
  })

  return {
    totalAssigned,
    completed: totalCompleted,
    pending: totalPending,
    overdue,
    completionRate: totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0,
    memberBreakdown,
  }
}

// ============================================
// Point Summary Section
// ============================================

/**
 * Get point summary across all family members.
 * Aggregates transaction data using Prisma groupBy for efficiency.
 */
export async function getPointSummary(familyId: string): Promise<PointSummarySection> {
  const members = await prisma.user.findMany({
    where: { familyId },
    select: { id: true, name: true, points: true },
  })

  // Aggregate by userId and amount sign (positive=earned, negative=spent)
  const transactions = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: {
      user: { familyId },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { amount: true },
  })

  const transactionSums = new Map(transactions.map((t) => [t.userId, t._sum.amount || 0]))

  let totalEarned = 0
  let totalSpent = 0
  const memberBalances = members.map((m) => {
    const net = transactionSums.get(m.id) || 0
    const earned = Math.max(0, net)
    const spent = Math.max(0, -net)
    totalEarned += earned
    totalSpent += spent
    return {
      userId: m.id,
      name: m.name,
      balance: m.points,
    }
  })

  return { memberBalances, totalEarnedThisPeriod: totalEarned, totalSpentThisPeriod: totalSpent }
}

// ============================================
// Activity Section
// ============================================

/**
 * Get recent activity (audit log entries) filtered by chore-relevant actions.
 * The familyId is accepted for future use; audit log scoping happens at the controller layer.
 */
export async function getActivity(_familyId: string, limit = 20): Promise<ActivitySection> {
  // Use page 1 (getAuditLogs is 1-indexed for pagination)
  const result = await getAuditLogs({
    actions: [
      'CHORE_ASSIGNED',
      'CHORE_COMPLETED',
      'CHORE_UPDATED',
      'CHORE_DELETED',
      'POINTS_EARNED',
      'POINTS_DEDUCTED',
      'POINTS_PAID_OUT',
      'RECURRING_CHORE_CREATED',
      'RECURRING_CHORE_OCCURRENCE_GENERATED',
    ],
    limit,
    page: 1,
  })

  return {
    entries: result.logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      userId: log.userId,
      timestamp: log.timestamp,
      details: log.newValue,
    })),
    total: result.total,
  }
}

// ============================================
// Rate Limits Section
// ============================================

/**
 * Get per-user rate limit data from the rateLimiter middleware.
 */
export async function getRateLimits(): Promise<RateLimitSection> {
  return {
    perUser: getUserRequestCounts(),
  }
}

// ============================================
// Dashboard Orchestrator
// ============================================

/**
 * Assemble the full admin dashboard data.
 * Each section is independently error-resilient via .catch(() => null).
 * All sections are fetched in parallel using Promise.all.
 */
export async function getDashboard(familyId: string): Promise<DashboardData> {
  const [health, choreStats, pointSummary, activity, rateLimits] = await Promise.all([
    getHealth().catch(() => null),
    getChoreStats(familyId).catch(() => null),
    getPointSummary(familyId).catch(() => null),
    getActivity(familyId).catch(() => null),
    getRateLimits().catch(() => null),
  ])

  return { health, choreStats, pointSummary, activity, rateLimits }
}
