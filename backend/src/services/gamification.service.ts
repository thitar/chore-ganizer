import { prisma } from '../config/prisma'
import { sendNtfy } from './notification.service'
import { badgeEarnedBody } from './notification.formatters'

export const LEVEL_THRESHOLDS = [0, 50, 120, 220, 360, 550, 800, 1120, 1520, 2000]

export interface LevelInfo {
  level: number
  lifetimePoints: number
  currentThreshold: number
  nextThreshold: number | null
  progress: number
}

export function computeLevel(lifetimePoints: number): LevelInfo {
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (lifetimePoints >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
      break
    }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1]
  const nextThreshold = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null
  const progress =
    nextThreshold === null
      ? 1
      : (lifetimePoints - currentThreshold) / (nextThreshold - currentThreshold)
  return { level, lifetimePoints, currentThreshold, nextThreshold, progress }
}

export async function getLifetimePoints(userId: number): Promise<number> {
  const aggregate = await prisma.pointLog.aggregate({
    where: { userId, type: { in: ['EARNED', 'BONUS'] }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  return aggregate._sum.amount ?? 0
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_STREAK_WEEKS = 52

export function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay() // 0=Sun..6=Sat
  const daysSinceMonday = (day + 6) % 7
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday)
  return monday
}

interface ChoreLike {
  dueDate: Date
  status: string
  completedAt: Date | null
}

export async function computeStreak(userId: number, currentWeekStart: Date): Promise<number> {
  const scanStart = new Date(currentWeekStart.getTime() - MAX_STREAK_WEEKS * WEEK_MS)
  const where = {
    assignedToId: userId,
    dueDate: { gte: scanStart, lt: currentWeekStart },
  }
  const select = { dueDate: true, status: true, completedAt: true }
  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({ where, select }),
    prisma.recurringOccurrence.findMany({ where, select }),
  ])
  const chores: ChoreLike[] = [...assignments, ...occurrences]

  // Bucket chores by how many weeks before the current week they were due (1 = last week)
  const byWeek = new Map<number, ChoreLike[]>()
  for (const c of chores) {
    const weeksAgo = Math.floor((currentWeekStart.getTime() - c.dueDate.getTime() - 1) / WEEK_MS) + 1
    if (!byWeek.has(weeksAgo)) byWeek.set(weeksAgo, [])
    byWeek.get(weeksAgo)!.push(c)
  }

  let streak = 0
  for (let weeksAgo = 1; weeksAgo <= MAX_STREAK_WEEKS; weeksAgo++) {
    const weekChores = byWeek.get(weeksAgo)
    if (!weekChores || weekChores.length === 0) continue // neutral week: no chores due
    const weekEnd = new Date(currentWeekStart.getTime() - (weeksAgo - 1) * WEEK_MS)
    const allOnTime = weekChores.every(
      (c) => c.status === 'COMPLETED' && c.completedAt !== null && c.completedAt < weekEnd
    )
    if (!allOnTime) break
    streak++
  }
  return streak
}

export async function getStreak(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakCount: true, streakComputedAt: true },
  })
  if (!user) return 0
  const weekStart = startOfWeekUTC(new Date())
  if (user.streakComputedAt && user.streakComputedAt >= weekStart) {
    return user.streakCount
  }
  const streak = await computeStreak(userId, weekStart)
  await prisma.user.update({
    where: { id: userId },
    data: { streakCount: streak, streakComputedAt: new Date() },
  })
  return streak
}

export interface BadgeDef {
  id: string
  name: string
  description: string
  emoji: string
}

export const BADGE_CATALOG: BadgeDef[] = [
  { id: 'first-chore', name: 'First Chore', description: 'Complete your first chore', emoji: '🎉' },
  { id: 'ten-chores', name: '10 Chores', description: 'Complete 10 chores', emoji: '✅' },
  { id: 'fifty-chores', name: '50 Chores', description: 'Complete 50 chores', emoji: '🏆' },
  { id: 'hundred-points', name: '100 Points', description: 'Earn 100 lifetime points', emoji: '💯' },
  { id: 'five-hundred-points', name: '500 Points', description: 'Earn 500 lifetime points', emoji: '💎' },
  { id: 'four-week-streak', name: '4-Week Streak', description: 'Keep a 4-week completion streak', emoji: '🔥' },
  { id: 'early-bird', name: 'Early Bird', description: 'Complete a chore before 9:00', emoji: '🌅' },
  { id: 'weekend-warrior', name: 'Weekend Warrior', description: 'Complete chores on Saturday and Sunday of the same weekend', emoji: '⚔️' },
]

async function collectStats(userId: number) {
  const completedWhere = { assignedToId: userId, status: 'COMPLETED' }
  const completedSelect = { completedAt: true }
  const [aCount, oCount, aDates, oDates, lifetimePoints, streak] = await Promise.all([
    prisma.choreAssignment.count({ where: completedWhere }),
    prisma.recurringOccurrence.count({ where: completedWhere }),
    prisma.choreAssignment.findMany({ where: completedWhere, select: completedSelect }),
    prisma.recurringOccurrence.findMany({ where: completedWhere, select: completedSelect }),
    getLifetimePoints(userId),
    getStreak(userId),
  ])
  const completedAts = [...aDates, ...oDates]
    .map((c) => c.completedAt)
    .filter((d): d is Date => d !== null)

  const earlyBird = completedAts.some((d) => d.getUTCHours() < 9)

  // Weekend warrior: a Saturday and the immediately following Sunday both have completions
  const dayKeys = new Set(completedAts.map((d) => d.toISOString().slice(0, 10)))
  const weekendWarrior = completedAts.some((d) => {
    if (d.getUTCDay() !== 6) return false
    const sunday = new Date(d)
    sunday.setUTCDate(sunday.getUTCDate() + 1)
    return dayKeys.has(sunday.toISOString().slice(0, 10))
  })

  return { completions: aCount + oCount, lifetimePoints, streak, earlyBird, weekendWarrior }
}

type Stats = Awaited<ReturnType<typeof collectStats>>

const BADGE_RULES: Record<string, (s: Stats) => boolean> = {
  'first-chore': (s) => s.completions >= 1,
  'ten-chores': (s) => s.completions >= 10,
  'fifty-chores': (s) => s.completions >= 50,
  'hundred-points': (s) => s.lifetimePoints >= 100,
  'five-hundred-points': (s) => s.lifetimePoints >= 500,
  'four-week-streak': (s) => s.streak >= 4,
  'early-bird': (s) => s.earlyBird,
  'weekend-warrior': (s) => s.weekendWarrior,
}

export async function evaluateBadges(userId: number): Promise<BadgeDef[]> {
  const [stats, existing] = await Promise.all([
    collectStats(userId),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ])
  const owned = new Set(existing.map((b: { badgeId: string }) => b.badgeId))
  const newlyEarned = BADGE_CATALOG.filter(
    (badge) => !owned.has(badge.id) && BADGE_RULES[badge.id](stats)
  )
  // SQLite has no createMany skipDuplicates; create sequentially (small N)
  for (const badge of newlyEarned) {
    await prisma.userBadge.create({ data: { userId, badgeId: badge.id } })
  }
  return newlyEarned
}

export async function getGamification(userId: number) {
  const [streak, lifetimePoints, earned] = await Promise.all([
    getStreak(userId),
    getLifetimePoints(userId),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    }),
  ])
  const earnedById = new Map(
    earned.map((b: { badgeId: string; earnedAt: Date }) => [b.badgeId, b.earnedAt])
  )
  return {
    streak,
    level: computeLevel(lifetimePoints),
    badges: BADGE_CATALOG.map((badge) => ({
      ...badge,
      earnedAt: earnedById.get(badge.id)?.toISOString() ?? null,
    })),
  }
}

export async function awardBadges(userId: number): Promise<void> {
  try {
    const newlyEarned = await evaluateBadges(userId)
    if (newlyEarned.length === 0) return
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ntfyTopic: true },
    })
    if (!user?.ntfyTopic) return
    for (const badge of newlyEarned) {
      const { title, body, priority, tags, click } = badgeEarnedBody(badge)
      await sendNtfy(user.ntfyTopic, title, body, { priority, tags, click })
    }
  } catch (err) {
    console.warn(
      `[gamification] awardBadges failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
