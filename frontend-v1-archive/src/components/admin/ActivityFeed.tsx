import React from 'react'
import { Loading, ErrorDisplay } from '../common'

interface ActivityEntry {
  id: number
  action: string
  entityType: string
  userId: number
  timestamp: string
  details: string | null
}

interface ActivityFeedData {
  entries: ActivityEntry[]
  total: number
}

interface ActivityFeedProps {
  data: ActivityFeedData | null
  loading: boolean
  error: string | null
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading activity..." />
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

  if (!data || !data.entries || data.entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <p className="text-gray-500 text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {data.entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
            <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{formatAction(entry.action)}</span>
                <span className="text-gray-500"> on {entry.entityType}</span>
              </p>
              {entry.details && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.details}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                User #{entry.userId} &middot; {formatTimestamp(entry.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
      {data.total > data.entries.length && (
        <p className="text-xs text-gray-400 mt-3">
          Showing {data.entries.length} of {data.total} entries
        </p>
      )}
    </div>
  )
}
