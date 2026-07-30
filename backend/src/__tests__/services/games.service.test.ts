jest.mock('../../config/prisma', () => ({
  prisma: {
    userBadge: { findUnique: jest.fn() },
    gameHighScore: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
  },
}))

const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

let gamesService: typeof import('../../services/games.service')

beforeEach(() => {
  jest.clearAllMocks()
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
      where: { game: 'PONG', user: { role: 'CHILD' } },
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
    } satisfies Partial<AppError>)
    expect(prisma.gameHighScore.findUnique).not.toHaveBeenCalled()
  })

  it('preserves an equal or lower personal best without writing', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 50 })

    await expect(gamesService.recordPongScore(2, 'CHILD', 50)).resolves.toEqual({
      personalBest: 50,
      isNewBest: false,
    })
    await expect(gamesService.recordPongScore(2, 'CHILD', 49)).resolves.toEqual({
      personalBest: 50,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.upsert).not.toHaveBeenCalled()
  })

  it('upserts a higher or first score as a new personal best', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.findUnique.mockResolvedValueOnce({ score: 50 }).mockResolvedValueOnce(null)
    prisma.gameHighScore.upsert.mockResolvedValueOnce({ score: 70 }).mockResolvedValueOnce({ score: 10 })

    await expect(gamesService.recordPongScore(2, 'CHILD', 70)).resolves.toEqual({ personalBest: 70, isNewBest: true })
    await expect(gamesService.recordPongScore(2, 'CHILD', 10)).resolves.toEqual({ personalBest: 10, isNewBest: true })
    expect(prisma.gameHighScore.upsert).toHaveBeenNthCalledWith(1, {
      where: { userId_game: { userId: 2, game: 'PONG' } },
      create: { userId: 2, game: 'PONG', score: 70 },
      update: { score: 70 },
    })
  })

  it('allows a parent to save a private score without checking badges', async () => {
    prisma.gameHighScore.findUnique.mockResolvedValue(null)
    prisma.gameHighScore.upsert.mockResolvedValue({ score: 25 })

    await expect(gamesService.recordPongScore(1, 'PARENT', 25)).resolves.toEqual({
      personalBest: 25,
      isNewBest: true,
    })
    expect(prisma.userBadge.findUnique).not.toHaveBeenCalled()
  })
})
