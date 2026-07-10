jest.mock('../../config/prisma', () => ({
  prisma: {
    pointLog: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

let pointsService: typeof import('../../services/points.service')

beforeEach(() => {
  jest.clearAllMocks()
  // Mirror the real prisma.$transaction shape (invokes the callback with a
  // tx client) using the same mocked prisma object as tx, so existing
  // assertions against prisma.pointLog.create etc. keep working unchanged.
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma))
  delete require.cache[require.resolve('../../services/points.service')]
  pointsService = require('../../services/points.service')
})

describe('pointsService.getMyPoints', () => {
  it('returns user, balance sum, and logs sorted by createdAt desc', async () => {
    const user = { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }
    const logs = [
      { id: 1, userId: 3, amount: 10, type: 'EARNED', reason: 'Wash', createdAt: new Date('2026-06-15') },
      { id: 2, userId: 3, amount: 15, type: 'BONUS', reason: 'Good week', createdAt: new Date('2026-06-10') },
    ]
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 25 } })
    prisma.pointLog.findMany.mockResolvedValue(logs)

    const result = await pointsService.getMyPoints(3)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      select: { id: true, name: true, color: true, role: true },
    })
    expect(prisma.pointLog.aggregate).toHaveBeenCalledWith({
      where: { userId: 3 },
      _sum: { amount: true },
    })
    expect(prisma.pointLog.findMany).toHaveBeenCalledWith({
      where: { userId: 3 },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    expect(result).toEqual({ user, balance: 25, logs })
  })

  it('returns balance 0 when no logs exist', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, name: 'Alice', color: '#10B981' })
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.pointLog.findMany.mockResolvedValue([])

    const result = await pointsService.getMyPoints(3)

    expect(result.balance).toBe(0)
    expect(result.logs).toEqual([])
  })

  it('throws 404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(pointsService.getMyPoints(999)).rejects.toThrow(AppError)
    await expect(pointsService.getMyPoints(999)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('pointsService.getUserPoints', () => {
  it('parent can view any user', async () => {
    const user = { id: 3, name: 'Alice', color: '#10B981' }
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 25 } })
    prisma.pointLog.findMany.mockResolvedValue([])

    const result = await pointsService.getUserPoints(3, 1, 'PARENT')

    expect(result.user).toEqual(user)
  })

  it('child can view own points', async () => {
    const user = { id: 3, name: 'Alice', color: '#10B981' }
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.pointLog.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
    prisma.pointLog.findMany.mockResolvedValue([])

    const result = await pointsService.getUserPoints(3, 3, 'CHILD')

    expect(result.user).toEqual(user)
  })

  it('child cannot view another user (403)', async () => {
    await expect(pointsService.getUserPoints(4, 3, 'CHILD')).rejects.toThrow(AppError)
    await expect(pointsService.getUserPoints(4, 3, 'CHILD')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 if target user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(pointsService.getUserPoints(999, 1, 'PARENT')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('pointsService.adjustPoints', () => {
  it('creates an ADJUSTMENT log with valid amount and reason', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, name: 'Alice' })
    const log = {
      id: 1,
      userId: 3,
      amount: 10,
      type: 'ADJUSTMENT',
      reason: 'Bonus for good behavior',
      createdAt: new Date(),
    }
    prisma.pointLog.create.mockResolvedValue(log)

    const result = await pointsService.adjustPoints(3, 10, 'Bonus for good behavior')

    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: {
        userId: 3,
        amount: 10,
        type: 'ADJUSTMENT',
        reason: 'Bonus for good behavior',
      },
    })
    expect(result).toEqual(log)
  })

  it('allows negative amounts (deduction)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, name: 'Alice' })
    prisma.pointLog.create.mockResolvedValue({ id: 1, amount: -5, type: 'ADJUSTMENT' })

    const result = await pointsService.adjustPoints(3, -5, 'Deduction')

    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: { userId: 3, amount: -5, type: 'ADJUSTMENT', reason: 'Deduction' },
    })
    expect(result.amount).toBe(-5)
  })

  it('throws 400 on zero amount', async () => {
    await expect(pointsService.adjustPoints(3, 0, 'Test')).rejects.toThrow(AppError)
    await expect(pointsService.adjustPoints(3, 0, 'Test')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 on empty reason', async () => {
    await expect(pointsService.adjustPoints(3, 5, '')).rejects.toThrow(AppError)
    await expect(pointsService.adjustPoints(3, 5, '')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 on reason > 200 chars', async () => {
    const longReason = 'a'.repeat(201)
    await expect(pointsService.adjustPoints(3, 5, longReason)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 on non-integer amount', async () => {
    await expect(pointsService.adjustPoints(3, 1.5, 'Test')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 if target user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(pointsService.adjustPoints(999, 5, 'Test')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('increments lifetimePoints when the adjustment amount is positive', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5 })
    prisma.pointLog.create.mockResolvedValue({ id: 1, userId: 5, amount: 20, type: 'ADJUSTMENT' })

    await pointsService.adjustPoints(5, 20, 'Bonus for extra effort')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { lifetimePoints: { increment: 20 } },
    })
  })

  it('does not increment lifetimePoints when the adjustment amount is negative', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5 })
    prisma.pointLog.create.mockResolvedValue({ id: 1, userId: 5, amount: -10, type: 'ADJUSTMENT' })

    await pointsService.adjustPoints(5, -10, 'Deduction')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('getLeaderboard', () => {
  it('returns only CHILD users with balances sorted descending, defaulting to 0', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' },
      { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' },
    ])
    prisma.pointLog.groupBy.mockResolvedValue([
      { userId: 2, _sum: { amount: 120 } },
      { userId: 1, _sum: { amount: 30 } },
    ])

    const result = await pointsService.getLeaderboard()

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'CHILD' },
      select: { id: true, name: true, color: true, role: true },
    })
    expect(result.map((e: { user: { id: number } }) => e.user.id)).toEqual([2, 3])
    expect(result[0].balance).toBe(120)
    expect(result[1].balance).toBe(0)
  })
})
