import { createApiClient } from '../lib/apiClient'

const api = createApiClient('/api/games')

export interface PongLeaderboardEntry {
  user: { id: number; name: string; color: string }
  score: number
}

export interface PongStatus {
  unlocked: boolean
  personalBest: number | null
  leaderboard: PongLeaderboardEntry[] | null
}

export interface GamesSummary {
  pong: PongStatus
}

export interface PongScoreResult {
  personalBest: number
  isNewBest: boolean
}

export async function getGames(): Promise<GamesSummary> {
  const response = await api.get('/me')
  return response.data.data
}

export async function submitPongScore(score: number): Promise<PongScoreResult> {
  const response = await api.post('/pong/scores', { score })
  return response.data.data
}
