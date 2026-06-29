import React from 'react'
import { Loading, ErrorDisplay } from '../common'

interface PerUserRate {
  userId: number
  count: number
  windowStart: string
}

interface RateLimitData {
  perUser: PerUserRate[]
}

interface RateLimitCardProps {
  data: RateLimitData | null
  loading: boolean
  error: string | null
}

export const RateLimitCard: React.FC<RateLimitCardProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading rate limits..." />
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

  if (!data || !data.perUser || data.perUser.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Rate Limits</h3>
        <p className="text-gray-500 text-sm">No rate limit data</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Rate Limits</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-500">User ID</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500">Requests</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500">Window Start</th>
            </tr>
          </thead>
          <tbody>
            {data.perUser.map((entry) => (
              <tr key={entry.userId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 text-gray-900 font-mono">{entry.userId}</td>
                <td className="py-2 px-2">
                  <span className="font-medium">{entry.count}</span>
                </td>
                <td className="py-2 px-2 text-gray-500">
                  {new Date(entry.windowStart).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
