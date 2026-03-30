import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useAuth } from '../hooks'
import { statisticsApi } from '../api'
import type { FamilyStatistics } from '../api/statistics.api'
import { Loading, ErrorDisplay } from '../components/common'

export const StatisticsPage: React.FC = () => {
  const { user, isParent } = useAuth()
  const [stats, setStats] = useState<FamilyStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{
    startDate: string
    endDate: string
  } | null>(null)

  useEffect(() => {
    if (user) {
      loadStatistics()
    }
  }, [user, dateRange])

  const loadStatistics = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const data = await statisticsApi.getFamilyStats(
        dateRange?.startDate,
        dateRange?.endDate
      )
      setStats(data)
    } catch (err: any) {
      console.error('Failed to load statistics:', err)
      const errorMsg = err?.error?.message || 'Failed to load statistics'
      const errorCode = err?.error?.code
      console.warn('[StatisticsPage] Error loading stats - code:', errorCode, 'message:', errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateRangeChange = (start: string, end: string) => {
    if (start && end) {
      setDateRange({ startDate: start, endDate: end })
    } else {
      setDateRange(null)
    }
  }

  // Set default date range (last 30 days)
  const setDefaultRange = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    })
  }

  // Only parents can view statistics
  if (!isParent) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p>Only parents can view family statistics.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorDisplay
          title="Unable to Load Statistics"
          message={error}
          onRetry={loadStatistics}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📊 Family Statistics</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange?.startDate || ''}
              onChange={(e) =>
                handleDateRangeChange(e.target.value, dateRange?.endDate || '')
              }
              className="px-3 py-1 border rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange?.endDate || ''}
              onChange={(e) =>
                handleDateRangeChange(dateRange?.startDate || '', e.target.value)
              }
              className="px-3 py-1 border rounded text-sm"
            />
          </div>
          <button
            onClick={setDefaultRange}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Chores</h3>
          <p className="text-2xl font-bold">{stats?.choreStats.totalAssigned || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Completed</h3>
          <p className="text-2xl font-bold text-green-600">
            {stats?.choreStats.completed || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Completion Rate</h3>
          <p className="text-2xl font-bold">
            {stats?.choreStats.completionRate.toFixed(1) || 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Overdue</h3>
          <p className="text-2xl font-bold text-red-600">
            {stats?.choreStats.overdue || 0}
          </p>
        </div>
      </div>

      {/* Family Members Summary */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Family Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.familyMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                  member.role === 'PARENT' ? 'bg-purple-500' : 'bg-blue-500'
                }`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {member.stats.completed}/{member.stats.totalAssigned} chores &mdash;{' '}
                  <span className="font-medium">{member.stats.completionRate.toFixed(0)}%</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point Trends Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Point Trends</h3>
        {stats?.pointTrends && stats.pointTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.pointTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString()
                }}
                formatter={(value, name) => {
                  const numValue = Number(value)
                  return [
                    name === 'totalPoints' ? `${numValue} points` : `${numValue} transactions`,
                    name === 'totalPoints' ? 'Points' : 'Transactions',
                  ]
                }}
              />
              <Legend />
              <Bar dataKey="totalPoints" fill="#4F46E5" name="Points Earned" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No point data available for the selected period
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        {stats?.activityFeed && stats.activityFeed.length > 0 ? (
          <ul className="space-y-2">
            {stats.activityFeed.map((activity, i) => {
              const isCompletion = activity.type === 'CHORE_COMPLETED'
              return (
                <li
                  key={i}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className={isCompletion ? 'text-green-500' : 'text-blue-500'}>
                      {isCompletion ? '✓' : '📋'}
                    </span>
                    <span>
                      <strong>{activity.user}</strong>{' '}
                      {isCompletion ? 'completed' : 'was assigned'}{' '}
                      <strong>{activity.choreTitle}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {isCompletion && (
                      <span className="text-green-600 font-medium">
                        +{activity.points} pts
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No recent activity to display
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.categoryBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="categoryName" width={120} tick={{ fontSize: 13 }} />
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === 'completed' ? 'Completed' : 'Total',
                ]}
              />
              <Legend />
              <Bar dataKey="total" fill="#CBD5E1" name="Total" />
              <Bar dataKey="completed" fill="#4F46E5" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No category data available for the selected period
          </div>
        )}
      </div>
    </div>
  )
}

export default StatisticsPage
