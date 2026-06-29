import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'

export interface DashboardData {
  health: any | null
  choreStats: any | null
  pointSummary: any | null
  activity: any | null
  rateLimits: any | null
}

export interface RateLimitPerUser {
  perUser: Array<{ userId: number; count: number; windowStart: string }>
}

export interface UserNotifSettings {
  settings: {
    ntfyTopic: string | null
    ntfyServerUrl: string | null
    notifyChoreAssigned: boolean
    notifyChoreDueSoon: boolean
    notifyChoreCompleted: boolean
    notifyChoreOverdue: boolean
    notifyPointsEarned: boolean
    reminderHoursBefore: number
  }
}

export function useAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null)
      const response = await apiClient.get<{ data: DashboardData }>('/admin/dashboard')
      setData(response.data?.data || null)
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load dashboard'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Auto-refresh for health + activity
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  return { data, loading, error, refresh: fetchDashboard }
}

export function useRateLimitsPerUser() {
  const [data, setData] = useState<RateLimitPerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setError(null)
      const response = await apiClient.get<{ data: RateLimitPerUser }>('/admin/rate-limits/per-user')
      setData(response.data?.data || null)
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load rate limits'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
