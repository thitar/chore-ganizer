import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { client } from '../api/client'
import { UsageBar } from '../components/layout/UsageBar'

interface RateLimitStatus {
  general: {
    windowMs: number
    max: number
    currentCount: number
    disabled: boolean
  }
  auth: {
    windowMs: number
    max: number
    currentCount: number
    disabled: boolean
  }
}

function formatWindow(windowMs: number): string {
  const seconds = Math.floor(windowMs / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  return `${hours} hours`
}

export function Settings() {
  const { isParent } = useAuth()
  const [status, setStatus] = useState<RateLimitStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  if (!isParent) return null

  useEffect(() => {
    let mounted = true
    async function fetchStatus() {
      try {
        setError(null)
        const response = await client.get<RateLimitStatus>('/admin/rate-limits/status')
        if (mounted) setStatus(response.data)
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.error?.message || err?.message || 'Failed to load rate limit status')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">API Rate Limiting</h2>
        {loading && <p className="text-gray-500">Loading rate limit status...</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        )}
        {status && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">General API Limiter</h3>
              <p className="text-sm text-gray-500">Window: {formatWindow(status.general.windowMs)}</p>
              {status.general.disabled && (
                <p className="text-sm text-orange-600 font-medium">Rate limiting is disabled</p>
              )}
              <UsageBar current={status.general.currentCount} max={status.general.max} label="Requests this window" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Auth API Limiter</h3>
              <p className="text-sm text-gray-500">Window: {formatWindow(status.auth.windowMs)}</p>
              {status.auth.disabled && (
                <p className="text-sm text-orange-600 font-medium">Rate limiting is disabled</p>
              )}
              <UsageBar current={status.auth.currentCount} max={status.auth.max} label="Requests this window" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}