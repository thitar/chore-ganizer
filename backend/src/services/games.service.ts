import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export const PONG_GAME = 'PONG'

async function canPlayPong(userId: number, role: string) {
  if (role === 'PARENT') return true

  const badge = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: 'ten-chores' } },
  })
  return badge !== null
}

export async function getGames(userId: number, role: string) {
  const unlocked = await canPlayPong(userId, role)
  if (!unlocked) {
    return { pong: { unlocked: false, personalBest: null, leaderboard: null } }
  }

  const personalBest = await prisma.gameHighScore.findUnique({
    where: { userId_game: { userId, game: PONG_GAME } },
  })

  if (role === 'PARENT') {
    return { pong: { unlocked: true, personalBest: personalBest?.score ?? null, leaderboard: null } }
  }

  const scores = await prisma.gameHighScore.findMany({
    where: {
      game: PONG_GAME,
      user: { role: 'CHILD', badges: { some: { badgeId: 'ten-chores' } } },
    },
    include: { user: { select: { id: true, name: true, color: true } } },
    orderBy: { score: 'desc' },
  })

  return {
    pong: {
      unlocked: true,
      personalBest: personalBest?.score ?? null,
      leaderboard: scores.map(({ user, score }) => ({ user, score })),
    },
  }
}

export async function recordPongScore(userId: number, role: string, score: number) {
  if (!(await canPlayPong(userId, role))) {
    throw new AppError('Pong is locked until you earn the 10 Chores badge', 403)
  }

  const updated = await prisma.gameHighScore.updateMany({
    where: { userId, game: PONG_GAME, score: { lt: score } },
    data: { score },
  })
  if (updated.count > 0) {
    return { personalBest: score, isNewBest: true }
  }

  const existing = await prisma.gameHighScore.findUnique({
    where: { userId_game: { userId, game: PONG_GAME } },
  })
  if (existing) {
    return { personalBest: existing.score, isNewBest: false }
  }

  try {
    const personalBest = await prisma.gameHighScore.create({ data: { userId, game: PONG_GAME, score } })
    return { personalBest: personalBest.score, isNewBest: true }
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2002') {
      throw error
    }

    const retriedUpdate = await prisma.gameHighScore.updateMany({
      where: { userId, game: PONG_GAME, score: { lt: score } },
      data: { score },
    })
    if (retriedUpdate.count > 0) {
      return { personalBest: score, isNewBest: true }
    }

    const persistedScore = await prisma.gameHighScore.findUnique({
      where: { userId_game: { userId, game: PONG_GAME } },
    })
    if (persistedScore) {
      return { personalBest: persistedScore.score, isNewBest: false }
    }

    throw error
  }
}
