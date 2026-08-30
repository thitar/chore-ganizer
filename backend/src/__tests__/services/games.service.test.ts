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
  it('unlocks every game for a parent without checking badges', async () => {
    prisma.gameHighScore.findUnique.mockResolvedValue(null)

    await expect(gamesService.getGames(1, 'PARENT')).resolves.toEqual({
      PONG: { unlocked: true, personalBest: null, leaderboard: null },
      SNAKE: { unlocked: true, personalBest: null, leaderboard: null },
      pong: { unlocked: true, personalBest: null, leaderboard: null },
      snake: { unlocked: true, personalBest: null, leaderboard: null },
    })
    expect(prisma.userBadge.findUnique).not.toHaveBeenCalled()
    expect(prisma.gameHighScore.findMany).not.toHaveBeenCalled()
  })

  it('returns a locked state for every game for a child without badges', async () => {
    prisma.userBadge.findUnique.mockResolvedValue(null)

    await expect(gamesService.getGames(2, 'CHILD')).resolves.toEqual({
      PONG: { unlocked: false, personalBest: null, leaderboard: null },
      SNAKE: { unlocked: false, personalBest: null, leaderboard: null },
      pong: { unlocked: false, personalBest: null, leaderboard: null },
      snake: { unlocked: false, personalBest: null, leaderboard: null },
    })
    expect(prisma.gameHighScore.findUnique).not.toHaveBeenCalled()
    expect(prisma.gameHighScore.findMany).not.toHaveBeenCalled()
  })

  it('unlocks a game only when the child holds that game badge', async () => {
    prisma.userBadge.findUnique.mockImplementation((args: any) =>
      Promise.resolve(args.where.userId_badgeId.badgeId === 'ten-chores' ? { id: 1 } : null),
    )
    prisma.gameHighScore.findUnique.mockResolvedValue(null)
    prisma.gameHighScore.findMany.mockResolvedValue([])

    await expect(gamesService.getGames(2, 'CHILD')).resolves.toEqual({
      PONG: { unlocked: true, personalBest: null, leaderboard: [] },
      SNAKE: { unlocked: false, personalBest: null, leaderboard: null },
      pong: { unlocked: true, personalBest: null, leaderboard: [] },
      snake: { unlocked: false, personalBest: null, leaderboard: null },
    })
  })

  it('returns an eligible child personal best and descending child leaderboard per game', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 42 })
    prisma.gameHighScore.findMany.mockResolvedValue([
      { score: 99, user: { id: 3, name: 'Sam', color: '#10B981' } },
      { score: 42, user: { id: 2, name: 'Alex', color: '#3B82F6' } },
    ])

    const pongEntry = {
      unlocked: true,
      personalBest: 42,
      leaderboard: [
        { user: { id: 3, name: 'Sam', color: '#10B981' }, score: 99 },
        { user: { id: 2, name: 'Alex', color: '#3B82F6' }, score: 42 },
      ],
    }
    const snakeEntry = {
      unlocked: true,
      personalBest: 42,
      leaderboard: [
        { user: { id: 3, name: 'Sam', color: '#10B981' }, score: 99 },
        { user: { id: 2, name: 'Alex', color: '#3B82F6' }, score: 42 },
      ],
    }
    await expect(gamesService.getGames(2, 'CHILD')).resolves.toEqual({
      PONG: pongEntry,
      SNAKE: snakeEntry,
      pong: pongEntry,
      snake: snakeEntry,
    })
    expect(prisma.gameHighScore.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        game: 'PONG',
        user: { role: 'CHILD', badges: { some: { badgeId: 'ten-chores' } } },
      },
      include: { user: { select: { id: true, name: true, color: true } } },
      orderBy: { score: 'desc' },
    })
    expect(prisma.gameHighScore.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        game: 'SNAKE',
        user: { role: 'CHILD', badges: { some: { badgeId: 'twenty-chores' } } },
      },
      include: { user: { select: { id: true, name: true, color: true } } },
      orderBy: { score: 'desc' },
    })
  })
})

describe('recordScore', () => {
  it('rejects a locked child score for SNAKE', async () => {
    prisma.userBadge.findUnique.mockResolvedValue(null)

    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 10)).rejects.toMatchObject({
      message: 'SNAKE is locked until you earn the twenty-chores badge',
      statusCode: 403,
    })
    expect(prisma.gameHighScore.findUnique).not.toHaveBeenCalled()
  })

  it('rejects an unknown game id with 404', async () => {
    await expect(gamesService.recordScore('BOGUS', 1, 'PARENT', 10)).rejects.toMatchObject({
      message: 'Unknown game: BOGUS',
      statusCode: 404,
    })
  })

  it('preserves an equal or lower personal best without writing', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 50 })

    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 50)).resolves.toEqual({
      personalBest: 50,
      isNewBest: false,
    })
    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 49)).resolves.toEqual({
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

    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 70)).resolves.toEqual({ personalBest: 70, isNewBest: true })
    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 10)).resolves.toEqual({ personalBest: 10, isNewBest: true })
    expect(prisma.gameHighScore.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 2, game: 'SNAKE', score: { lt: 70 } },
      data: { score: 70 },
    })
    expect(prisma.gameHighScore.create).toHaveBeenCalledWith({ data: { userId: 2, game: 'SNAKE', score: 10 } })
  })

  it('uses a conditional update so a lower concurrent score cannot replace a higher score', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 80 })

    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 70)).resolves.toEqual({
      personalBest: 80,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.updateMany).toHaveBeenCalledWith({
      where: { userId: 2, game: 'SNAKE', score: { lt: 70 } },
      data: { score: 70 },
    })
    expect(prisma.gameHighScore.create).not.toHaveBeenCalled()
  })

  it('retries a colliding first-score create and returns the persisted higher score', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ score: 80 })
    prisma.gameHighScore.create.mockRejectedValue({ code: 'P2002' })

    await expect(gamesService.recordScore('SNAKE', 2, 'CHILD', 70)).resolves.toEqual({
      personalBest: 80,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.updateMany).toHaveBeenCalledTimes(2)
    expect(prisma.gameHighScore.updateMany).toHaveBeenLastCalledWith({
      where: { userId: 2, game: 'SNAKE', score: { lt: 70 } },
      data: { score: 70 },
    })
  })

  it('allows a parent to save a private SNAKE score without checking badges', async () => {
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue(null)
    prisma.gameHighScore.create.mockResolvedValue({ score: 25 })

    await expect(gamesService.recordScore('SNAKE', 1, 'PARENT', 25)).resolves.toEqual({
      personalBest: 25,
      isNewBest: true,
    })
    expect(prisma.userBadge.findUnique).not.toHaveBeenCalled()
  })

  it('mirrors PONG behavior for an eligible child', async () => {
    prisma.userBadge.findUnique.mockResolvedValue({ id: 1 })
    prisma.gameHighScore.updateMany.mockResolvedValue({ count: 0 })
    prisma.gameHighScore.findUnique.mockResolvedValue({ score: 50 })

    await expect(gamesService.recordScore('PONG', 2, 'CHILD', 50)).resolves.toEqual({
      personalBest: 50,
      isNewBest: false,
    })
    expect(prisma.gameHighScore.findMany).not.toHaveBeenCalled()
  })
})
