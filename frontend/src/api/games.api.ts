import { createApiClient } from '../lib/apiClient'

const api = createApiClient('/api/games')

export interface GameLeaderboardEntry {
  user: { id: number; name: string; color: string }
  score: number
}

export interface GameStatus {
  unlocked: boolean
  personalBest: number | null
  leaderboard: GameLeaderboardEntry[] | null
}

export type GamesSummary = Record<string, GameStatus>

export interface GameScoreResult {
  personalBest: number
  isNewBest: boolean
}

// Legacy aliases for backward compat — callers should migrate to Game* names and the
// generic submitScore(gameId, score) / keyed GamesSummary shape (PONG, SNAKE).
export type PongLeaderboardEntry = GameLeaderboardEntry
export type PongStatus = GameStatus
export type PongScoreResult = GameScoreResult

export async function getGames(): Promise<GamesSummary> {
  const response = await api.get('/me')
  return response.data.data
}

export async function submitScore(gameId: string, score: number): Promise<GameScoreResult> {
  const response = await api.post(`/${gameId}/scores`, { score })
  return response.data.data
}

export async function submitPongScore(score: number): Promise<GameScoreResult> {
  return submitScore('PONG', score)
}
