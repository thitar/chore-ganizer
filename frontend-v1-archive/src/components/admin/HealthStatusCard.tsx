import React from 'react'
import { Loading, ErrorDisplay } from '../common'

export interface HealthSection {
  status: 'ok' | 'degraded' | 'error'
  database: 'connected' | 'error'
  uptime: number
}

interface HealthStatusCardProps {
  data: HealthSection | null
  loading: boolean
  error: string | null
}

const statusColors: Record<string, string> = {
  ok: 'bg-green-500',
  degraded: 'bg-yellow-500',
  error: 'bg-red-500',
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading health..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <ErrorDisplay message={error} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <p className="text-gray-500 text-sm">No health data</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">System Health</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[data.status]}`} />
          <span className="text-sm capitalize">{data.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${data.database === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm">Database: {data.database}</span>
        </div>
        <p className="text-xs text-gray-500">
          Uptime: {Math.floor(data.uptime / 60)}m {data.uptime % 60}s
        </p>
      </div>
    </div>
  )
}
