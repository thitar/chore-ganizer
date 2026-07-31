jest.mock('../../config/prisma', () => ({
  prisma: {
    userBadge: { findUnique: jest.fn() },
    gameHighScore: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  },
}))

const { prisma } = require('../../config/prisma')

let gamesService: typeof import('../../services/games.service')

beforeEach(() => {
  jest.resetAllMocks()
  delete require.cache[require.resolve('../../services/games.service')]
  gamesService = require('../../services/games.service')
})

describe('getGames', () => {
  it('unlocks Pong for a parent without checking badges', async () => {
    prisma.gameHighScore.findUnique.mockResolvedValue(null)

    await expect(gamesService.getGames(1, 'PARENT')).resolves.toEqual({
      pong: { unlocked: true, personalBest: null, leaderboard: null },
    })
    expect(prisma.userBadge.findUnique).not.toHaveBeenCalled()
    expect(prisma.gameHighScore.findMany).not.toHaveBeenCalled()
  })

  it('returns a locked Pong state for a child without the badge', async () => {
    prisma.userBadge.findUnique.mockResolvedValue(null)

    await expect(gamesService.getGames(2, 'CHILD')).resolves.toEqual({
      pong: { unlocked: false, personalBest: null, leaderboard: null },
    })
    expect(prisma.gameHighScore.findUnique).not.toHaveBeenCalled()
    expect(prisma.gameHighScore.findMany).not.toHaveBeenCalled()
  })

  it('returns an eligible child personal best and descending child leaderboard', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 42 })
    prisma.gameHighScore.findMany.mockResolvedValue([
      { score: 99, user: { id: 3, name: 'Sam', color: '#10B981' } },
      { score: 42, user: { id: 2, name: 'Alex', color: '#3B82F6' } },
    ])

    await expect(gamesService.getGames(2, 'CHILD')).resolves.toEqual({
      pong: {
        unlocked: true,
        personalBest: 42,
        leaderboard: [
          { user: { id: 3, name: 'Sam', color: '#10B981' }, score: 99 },
          { user: { id: 2, name: 'Alex', color: '#3B82F6' }, score: 42 },
        ],
      },
    })
    expect(prisma.gameHighScore.findMany).toHaveBeenCalledWith({
      where: {
        game: 'PONG',
        user: { role: 'CHILD', badges: { some: { badgeId: 'ten-chores' } } },
      },
      include: { user: { select: { id: true, name: true, color: true } } },
      orderBy: { score: 'desc' },
    })
  })
})

describe('recordPongScore', () => {
  it('rejects a locked child score', async () => {
    prisma.userBadge.findUnique.mockResolvedValue(null)

    await expect(gamesService.recordPongScore(2, 'CHILD', 10)).rejects.toMatchObject({
      message: 'Pong is locked until you earn the 10 Chores badge',
      statusCode: 403,
    })
    expect(prisma.gameHighScore.findUnique).not.toHaveBeenCalled()
  })

  it('preserves an equal or lower personal best without writing', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 50 })

    await expect(gamesService.recordPongScore(2, 'CHILD', 50)).resolves.toEqual({
      personalBest: 50,
      isNewBest: false,
    })
    await expect(gamesService.recordPongScore(2, 'CHILD', 49)).resolves.toEqual({
      personalBest: 50,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.create).not.toHaveBeenCalled()
  })

  it('updates a higher score or creates a first score as a new personal best', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValueOnce(null)
    prisma.gameHighScore.create.mockResolvedValueOnce({ score: 10 })

    await expect(gamesService.recordPongScore(2, 'CHILD', 70)).resolves.toEqual({ personalBest: 70, isNewBest: true })
    await expect(gamesService.recordPongScore(2, 'CHILD', 10)).resolves.toEqual({ personalBest: 10, isNewBest: true })
    expect(prisma.gameHighScore.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 2, game: 'PONG', score: { lt: 70 } },
      data: { score: 70 },
    })
    expect(prisma.gameHighScore.create).toHaveBeenCalledWith({ data: { userId: 2, game: 'PONG', score: 10 } })
  })

  it('uses a conditional update so a lower concurrent score cannot replace a higher score', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 80 })

    await expect(gamesService.recordPongScore(2, 'CHILD', 70)).resolves.toEqual({
      personalBest: 80,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.updateMany).toHaveBeenCalledWith({
      where: { userId: 2, game: 'PONG', score: { lt: 70 } },
      data: { score: 70 },
    })
    expect(prisma.gameHighScore.create).not.toHaveBeenCalled()
  })

  it('retries a colliding first-score create and returns the persisted higher score', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ score: 80 })
    prisma.gameHighScore.create.mockRejectedValue({ code: 'P2002' })

    await expect(gamesService.recordPongScore(2, 'CHILD', 70)).resolves.toEqual({
      personalBest: 80,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.updateMany).toHaveBeenCalledTimes(2)
    expect(prisma.gameHighScore.updateMany).toHaveBeenLastCalledWith({
      where: { userId: 2, game: 'PONG', score: { lt: 70 } },
      data: { score: 70 },
    })
  })

  it('allows a parent to save a private score without checking badges', async () => {
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue(null)
    prisma.gameHighScore.create.mockResolvedValue({ score: 25 })

    await expect(gamesService.recordPongScore(1, 'PARENT', 25)).resolves.toEqual({
      personalBest: 25,
      isNewBest: true,
    })
    expect(prisma.userBadge.findUnique).not.toHaveBeenCalled()
  })
})
