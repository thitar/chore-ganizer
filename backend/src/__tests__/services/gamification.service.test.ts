jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    pointLog: { aggregate: jest.fn() },
    choreAssignment: { findMany: jest.fn(), count: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), count: jest.fn() },
    userBadge: { findMany: jest.fn(), create: jest.fn() },
  },
}))
jest.mock('../../services/notification.service', () => ({
  sendNtfy: jest.fn().mockResolvedValue(true),
  isNtfyConfigured: true,
}))

const { prisma } = require('../../config/prisma')

let gamification: typeof import('../../services/gamification.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/gamification.service')]
  gamification = require('../../services/gamification.service')
})

afterEach(() => {
  jest.useRealTimers()
})

describe('computeLevel', () => {
  it('is level 1 at 0 points with progress toward 50', () => {
    const r = gamification.computeLevel(0)
    expect(r.level).toBe(1)
    expect(r.currentThreshold).toBe(0)
    expect(r.nextThreshold).toBe(50)
    expect(r.progress).toBe(0)
  })

  it('is level 2 at exactly 50 points', () => {
    const r = gamification.computeLevel(50)
    expect(r.level).toBe(2)
    expect(r.nextThreshold).toBe(120)
  })

  it('computes fractional progress', () => {
    const r = gamification.computeLevel(85)
    expect(r.level).toBe(2)
    expect(r.progress).toBeCloseTo((85 - 50) / (120 - 50))
  })

  it('caps at max level with progress 1 and null nextThreshold', () => {
    const r = gamification.computeLevel(99999)
    expect(r.level).toBe(10)
    expect(r.nextThreshold).toBeNull()
    expect(r.progress).toBe(1)
  })
})

describe('getLifetimePoints', () => {
  it('sums positive EARNED and BONUS logs only', async () => {
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 140 } })
    const total = await gamification.getLifetimePoints(3)
    expect(total).toBe(140)
    expect(prisma.pointLog.aggregate).toHaveBeenCalledWith({
      where: { userId: 3, type: { in: ['EARNED', 'BONUS'] }, amount: { gt: 0 } },
      _sum: { amount: true },
    })
  })

  it('returns 0 when there are no logs', async () => {
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: null } })
    expect(await gamification.getLifetimePoints(3)).toBe(0)
  })
})

describe('startOfWeekUTC', () => {
  it('returns the Monday 00:00 UTC of the given date', () => {
    // 2026-07-08 is a Wednesday → Monday is 2026-07-06
    const monday = gamification.startOfWeekUTC(new Date('2026-07-08T15:30:00Z'))
    expect(monday.toISOString()).toBe('2026-07-06T00:00:00.000Z')
  })

  it('returns the same day for a Monday', () => {
    const monday = gamification.startOfWeekUTC(new Date('2026-07-06T00:00:00Z'))
    expect(monday.toISOString()).toBe('2026-07-06T00:00:00.000Z')
  })

  it('maps Sunday back to the preceding Monday', () => {
    const monday = gamification.startOfWeekUTC(new Date('2026-07-12T10:00:00Z'))
    expect(monday.toISOString()).toBe('2026-07-06T00:00:00.000Z')
  })
})

describe('computeStreak', () => {
  const weekStart = new Date('2026-07-06T00:00:00Z')

  function chore(dueDate: string, status: string, completedAt: string | null) {
    return {
      dueDate: new Date(dueDate + 'T00:00:00Z'),
      status,
      completedAt: completedAt ? new Date(completedAt) : null,
    }
  }

  it('counts consecutive fully-completed weeks ending last week', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      chore('2026-07-01', 'COMPLETED', '2026-07-01T18:00:00Z'),
      chore('2026-06-24', 'COMPLETED', '2026-06-24T18:00:00Z'),
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    expect(await gamification.computeStreak(3, weekStart)).toBe(2)
  })

  it('breaks on a week with an incomplete chore', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      chore('2026-07-01', 'COMPLETED', '2026-07-01T18:00:00Z'),
      chore('2026-06-24', 'PENDING', null),
      chore('2026-06-17', 'COMPLETED', '2026-06-17T18:00:00Z'),
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    expect(await gamification.computeStreak(3, weekStart)).toBe(1)
  })

  it('treats late completion (after that week ended) as a break', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      chore('2026-07-01', 'COMPLETED', '2026-07-06T10:00:00Z'),
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    expect(await gamification.computeStreak(3, weekStart)).toBe(0)
  })

  it('skips empty weeks without breaking the streak', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      chore('2026-07-01', 'COMPLETED', '2026-07-01T18:00:00Z'),
      chore('2026-06-17', 'COMPLETED', '2026-06-17T18:00:00Z'),
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    expect(await gamification.computeStreak(3, weekStart)).toBe(2)
  })

  it('merges chores from both tables into the same week', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      chore('2026-07-01', 'COMPLETED', '2026-07-01T18:00:00Z'),
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([
      chore('2026-07-02', 'PENDING', null),
    ])
    expect(await gamification.computeStreak(3, weekStart)).toBe(0)
  })

  it('returns 0 when there is no history', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    expect(await gamification.computeStreak(3, weekStart)).toBe(0)
  })
})

describe('getStreak (cache)', () => {
  it('returns cached value when computed this week', async () => {
    jest.useFakeTimers({ now: new Date('2026-07-08T12:00:00Z') })
    prisma.user.findUnique.mockResolvedValue({
      streakCount: 5,
      streakComputedAt: new Date('2026-07-06T09:00:00Z'),
    })
    expect(await gamification.getStreak(3)).toBe(5)
    expect(prisma.choreAssignment.findMany).not.toHaveBeenCalled()
  })

  it('recomputes and caches when stale', async () => {
    jest.useFakeTimers({ now: new Date('2026-07-08T12:00:00Z') })
    prisma.user.findUnique.mockResolvedValue({
      streakCount: 5,
      streakComputedAt: new Date('2026-07-03T09:00:00Z'),
    })
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.user.update.mockResolvedValue({})
    expect(await gamification.getStreak(3)).toBe(0)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { streakCount: 0, streakComputedAt: expect.any(Date) },
    })
  })
})

describe('evaluateBadges', () => {
  beforeEach(() => {
    prisma.choreAssignment.count.mockResolvedValue(0)
    prisma.recurringOccurrence.count.mockResolvedValue(0)
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.userBadge.findMany.mockResolvedValue([])
    prisma.userBadge.create.mockResolvedValue({})
    prisma.user.findUnique.mockResolvedValue({
      streakCount: 0,
      streakComputedAt: new Date(),
    })
  })

  it('awards first-chore and early-bird for one early completion', async () => {
    prisma.choreAssignment.count.mockResolvedValue(1)
    prisma.choreAssignment.findMany.mockResolvedValue([
      { completedAt: new Date('2026-07-06T07:30:00Z') },
    ])
    const earned = await gamification.evaluateBadges(3)
    const ids = earned.map((b) => b.id).sort()
    expect(ids).toEqual(['early-bird', 'first-chore'])
    expect(prisma.userBadge.create).toHaveBeenCalledTimes(2)
  })

  it('does not re-award existing badges', async () => {
    prisma.choreAssignment.count.mockResolvedValue(1)
    prisma.choreAssignment.findMany.mockResolvedValue([
      { completedAt: new Date('2026-07-06T15:00:00Z') },
    ])
    prisma.userBadge.findMany.mockResolvedValue([{ badgeId: 'first-chore' }])
    const earned = await gamification.evaluateBadges(3)
    expect(earned).toEqual([])
    expect(prisma.userBadge.create).not.toHaveBeenCalled()
  })

  it('awards point badges from lifetime points', async () => {
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 520 } })
    const earned = await gamification.evaluateBadges(3)
    const ids = earned.map((b) => b.id).sort()
    expect(ids).toEqual(['five-hundred-points', 'hundred-points'])
  })

  it('awards four-week-streak from cached streak', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streakCount: 4,
      streakComputedAt: new Date(),
    })
    const earned = await gamification.evaluateBadges(3)
    expect(earned.map((b) => b.id)).toContain('four-week-streak')
  })

  it('awards weekend-warrior for completions on Sat and Sun of the same weekend', async () => {
    prisma.choreAssignment.count.mockResolvedValue(2)
    prisma.choreAssignment.findMany.mockResolvedValue([
      { completedAt: new Date('2026-07-04T10:00:00Z') },
      { completedAt: new Date('2026-07-05T10:00:00Z') },
    ])
    const earned = await gamification.evaluateBadges(3)
    expect(earned.map((b) => b.id)).toContain('weekend-warrior')
  })

  it('does not award weekend-warrior for Sat and Sun of different weekends', async () => {
    prisma.choreAssignment.count.mockResolvedValue(2)
    prisma.choreAssignment.findMany.mockResolvedValue([
      { completedAt: new Date('2026-07-04T10:00:00Z') },
      { completedAt: new Date('2026-07-12T10:00:00Z') },
    ])
    const earned = await gamification.evaluateBadges(3)
    expect(earned.map((b) => b.id)).not.toContain('weekend-warrior')
  })
})

describe('getGamification', () => {
  it('returns streak, level, and full catalog with earnedAt flags', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streakCount: 2,
      streakComputedAt: new Date(),
    })
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 85 } })
    prisma.userBadge.findMany.mockResolvedValue([
      { badgeId: 'first-chore', earnedAt: new Date('2026-07-01T10:00:00Z') },
    ])

    const g = await gamification.getGamification(3)

    expect(g.streak).toBe(2)
    expect(g.level.level).toBe(2)
    expect(g.badges).toHaveLength(8)
    const first = g.badges.find((b) => b.id === 'first-chore')!
    expect(first.earnedAt).toBe('2026-07-01T10:00:00.000Z')
    const locked = g.badges.find((b) => b.id === 'fifty-chores')!
    expect(locked.earnedAt).toBeNull()
  })
})

describe('awardBadges', () => {
  it('sends one ntfy per newly earned badge to the user topic', async () => {
    const { sendNtfy } = require('../../services/notification.service')
    prisma.choreAssignment.count.mockResolvedValue(1)
    prisma.choreAssignment.findMany.mockResolvedValue([
      { completedAt: new Date('2026-07-06T15:00:00Z') },
    ])
    prisma.recurringOccurrence.count.mockResolvedValue(0)
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.userBadge.findMany.mockResolvedValue([])
    prisma.userBadge.create.mockResolvedValue({})
    prisma.user.findUnique
      .mockResolvedValueOnce({ streakCount: 0, streakComputedAt: new Date() }) // getStreak
      .mockResolvedValueOnce({ ntfyTopic: 'alice-topic-123' }) // topic lookup

    await gamification.awardBadges(3)

    expect(sendNtfy).toHaveBeenCalledTimes(1) // first-chore only
    expect(sendNtfy).toHaveBeenCalledWith(
      'alice-topic-123',
      'Chore-Ganizer',
      expect.stringContaining('First Chore'),
      expect.objectContaining({ click: '/profile' })
    )
  })

  it('never throws even if evaluation fails', async () => {
    prisma.userBadge.findMany.mockRejectedValue(new Error('db gone'))
    prisma.choreAssignment.count.mockResolvedValue(0)
    prisma.recurringOccurrence.count.mockResolvedValue(0)
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.user.findUnique.mockResolvedValue({ streakCount: 0, streakComputedAt: new Date() })
    await expect(gamification.awardBadges(3)).resolves.toBeUndefined()
  })
})
