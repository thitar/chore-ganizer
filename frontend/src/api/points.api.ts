import axios from 'axios'
import { applyCsrfInterceptor } from '../lib/csrf'

const api = applyCsrfInterceptor(axios.create({ baseURL: '/api/points', withCredentials: true }))

export type PointLogType =
  | 'EARNED'
  | 'BONUS'
  | 'DEDUCTION'
  | 'PENALTY'
  | 'REVERSED'
  | 'ADJUSTMENT'
  | 'PAYOUT'
  | 'ADVANCE'

export interface PointLog {
  id: number
  userId: number
  amount: number
  reason: string
  type: PointLogType
  createdAt: string
  user?: { id: number; name: string; color: string }
}

export interface PointsSummary {
  user: { id: number; name: string; color: string; role: string }
  balance: number
  logs: PointLog[]
}

export async function getMyPoints(): Promise<PointsSummary> {
  const response = await api.get('/me')
  return response.data.data
}

export async function getUserPoints(userId: number): Promise<PointsSummary> {
  const response = await api.get(`/users/${userId}`)
  return response.data.data
}

export async function adjustPoints(
  userId: number,
  amount: number,
  reason: string
): Promise<PointLog> {
  const response = await api.post('/adjust', { userId, amount, reason })
  return response.data.data
}

export interface LeaderboardEntry {
  user: { id: number; name: string; color: string; role: string }
  balance: number
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await api.get('/leaderboard')
  return response.data.data
}

export interface GamificationBadge {
  id: string
  name: string
  description: string
  emoji: string
  earnedAt: string | null
}

export interface Gamification {
  streak: number
  level: {
    level: number
    lifetimePoints: number
    currentThreshold: number
    nextThreshold: number | null
    progress: number
  }
  badges: GamificationBadge[]
}

export async function getMyGamification(): Promise<Gamification> {
  const response = await api.get('/gamification')
  return response.data.data
}
