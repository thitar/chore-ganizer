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

// Legacy aliases for backward compat — kept until #222 migrates the single caller
// (GamesPage) from `data.pong` / `submitPongScore` to the keyed shape + generic
// submitScore(gameId, score). See PR #228 review.
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
