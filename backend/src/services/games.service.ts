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
    where: { game: PONG_GAME, user: { role: 'CHILD' } },
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

  const existing = await prisma.gameHighScore.findUnique({
    where: { userId_game: { userId, game: PONG_GAME } },
  })
  if (existing && score <= existing.score) {
    return { personalBest: existing.score, isNewBest: false }
  }

  const personalBest = await prisma.gameHighScore.upsert({
    where: { userId_game: { userId, game: PONG_GAME } },
    create: { userId, game: PONG_GAME, score },
    update: { score },
  })
  return { personalBest: personalBest.score, isNewBest: true }
}
