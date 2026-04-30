import { useEffect, useState } from 'react'
import { useAuth } from '../hooks'
import client from '../api/client'

interface RateLimitStatus {
  general: {
    windowMs: number
    max: number
    currentCount: number
    windowStart: string
    disabled: boolean
  }
  auth: {
    windowMs: number
    max: number
  }
}

function formatWindow(ms: number): string {
  const minutes = Math.round(ms / 60000)
  return `${minutes} min`
}

function UsageBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="mt-2">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{label}</span>
        <span>{current} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Settings() {
  const { isParent } = useAuth()
  const [status, setStatus] = useState<RateLimitStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (!isParent) return null

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
              <h3 className="font-medium text-gray-700">Auth Route Limiter</h3>
              <p className="text-sm text-gray-500">Window: {formatWindow(status.auth.windowMs)}</p>
              <p className="text-sm text-gray-500">Max: {status.auth.max} requests</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
