import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export interface GameDef {
  unlockBadge: string
}

export interface GameStatus {
  unlocked: boolean
  personalBest: number | null
  leaderboard: { user: { id: number; name: string; color: string }; score: number }[] | null
}

export const GAME_DEFS: Record<string, GameDef> = {
  PONG: { unlockBadge: 'ten-chores' },
  SNAKE: { unlockBadge: 'twenty-chores' },
}

export function listGameIds(): string[] {
  return Object.keys(GAME_DEFS)
}

async function canPlay(gameId: string, userId: number, role: string): Promise<boolean> {
  if (!Object.prototype.hasOwnProperty.call(GAME_DEFS, gameId)) return false
  if (role === 'PARENT') return true

  const def = GAME_DEFS[gameId]

  const badge = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: def.unlockBadge } },
  })
  return badge !== null
}

export async function getGames(userId: number, role: string): Promise<Record<string, GameStatus>> {
  const gameIds = listGameIds()

  const entries = await Promise.all(
    gameIds.map(async (gameId): Promise<[string, GameStatus]> => {
      const def = GAME_DEFS[gameId]
      const unlocked = await canPlay(gameId, userId, role)

      if (!unlocked) {
        return [gameId, { unlocked: false, personalBest: null, leaderboard: null }]
      }

      const personalBest = await prisma.gameHighScore.findUnique({
        where: { userId_game: { userId, game: gameId } },
      })

      if (role === 'PARENT') {
        return [gameId, { unlocked: true, personalBest: personalBest?.score ?? null, leaderboard: null }]
      }

      const scores = await prisma.gameHighScore.findMany({
        where: {
          game: gameId,
          user: { role: 'CHILD', badges: { some: { badgeId: def.unlockBadge } } },
        },
        include: { user: { select: { id: true, name: true, color: true } } },
        orderBy: { score: 'desc' },
      })

      return [
        gameId,
        {
          unlocked: true,
          personalBest: personalBest?.score ?? null,
          leaderboard: scores.map(({ user, score }) => ({ user, score })),
        },
      ]
    }),
  )

  const result: Record<string, GameStatus> = Object.fromEntries(entries)

  // Backward-compat: shipped clients may still read lowercase aliases (`pong`/`snake`).
  // Keep until next major version or after verifying no shipped client reads lowercase —
  // do not remove on a single-ticket basis.
  for (const gameId of listGameIds()) {
    const lower = gameId.toLowerCase()
    if (result[gameId] && !Object.prototype.hasOwnProperty.call(result, lower)) {
      result[lower] = result[gameId]
    }
  }

  return result
}

export async function recordScore(gameId: string, userId: number, role: string, score: number) {
  if (!Object.prototype.hasOwnProperty.call(GAME_DEFS, gameId)) {
    throw new AppError(`Unknown game: ${gameId}`, 404)
  }
  const def = GAME_DEFS[gameId]

  if (!(await canPlay(gameId, userId, role))) {
    throw new AppError(`${gameId} is locked until you earn the ${def.unlockBadge} badge`, 403)
  }

  const updated = await prisma.gameHighScore.updateMany({
    where: { userId, game: gameId, score: { lt: score } },
    data: { score },
  })
  if (updated.count > 0) {
    return { personalBest: score, isNewBest: true }
  }

  const existing = await prisma.gameHighScore.findUnique({
    where: { userId_game: { userId, game: gameId } },
  })
  if (existing) {
    return { personalBest: existing.score, isNewBest: false }
  }

  try {
    const personalBest = await prisma.gameHighScore.create({ data: { userId, game: gameId, score } })
    return { personalBest: personalBest.score, isNewBest: true }
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2002') {
      throw error
    }

    const retriedUpdate = await prisma.gameHighScore.updateMany({
      where: { userId, game: gameId, score: { lt: score } },
      data: { score },
    })
    if (retriedUpdate.count > 0) {
      return { personalBest: score, isNewBest: true }
    }

    const persistedScore = await prisma.gameHighScore.findUnique({
      where: { userId_game: { userId, game: gameId } },
    })
    if (persistedScore) {
      return { personalBest: persistedScore.score, isNewBest: false }
    }

    throw error
  }
}
