import apiClient from './client'
import type { ApiResponse } from '../types'

export interface FamilyStatistics {
  familyMembers: Array<{
    id: number
    name: string
    role: string
  }>
  choreStats: {
    totalAssigned: number
    completed: number
    pending: number
    overdue: number
    completionRate: number
  }
  pointTrends: Array<{
    date: string
    totalPoints: number
    count: number
  }>
  activityFeed: Array<{
    type: string
    user: string
    choreTitle: string
    points: number
    date: string
  }>
  dateRange: {
    startDate: string
    endDate: string
  }
}

export interface ChildStatistics {
  totalAssigned: number
  completed: number
  completionRate: number
  currentPoints: number
  pointsEarned: number
  pointsSpent: number
  pointHistory: Array<{
    id: number
    type: string
    amount: number
    description: string | null
    createdAt: string
  }>
}

export const statisticsApi = {
  getFamilyStats: async (startDate?: string, endDate?: string): Promise<FamilyStatistics> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<FamilyStatistics>(`/statistics/family${query}`)
    return response.data
  },

  getChildStats: async (childId: number, startDate?: string, endDate?: string): Promise<ChildStatistics> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<ChildStatistics>(`/statistics/child/${childId}${query}`)
    return response.data
  },
}

export default statisticsApi
