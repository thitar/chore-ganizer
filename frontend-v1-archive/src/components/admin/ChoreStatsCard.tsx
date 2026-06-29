import React from 'react'
import { Loading, ErrorDisplay } from '../common'

interface MemberBreakdown {
  userId: number
  name: string
  totalAssigned: number
  completed: number
  completionRate: number
}

export interface ChoreStatsData {
  totalAssigned: number
  completed: number
  pending: number
  overdue: number
  completionRate: number
  memberBreakdown: MemberBreakdown[]
}

interface ChoreStatsCardProps {
  data: ChoreStatsData | null
  loading: boolean
  error: string | null
}

function completionBarColor(rate: number): string {
  if (rate >= 80) return 'bg-green-500'
  if (rate >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

export const ChoreStatsCard: React.FC<ChoreStatsCardProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading chore stats..." />
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
        <p className="text-gray-500 text-sm">No chore statistics</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Chore Completion</h3>

      {/* Overall stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{data.totalAssigned}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{data.completed}</p>
          <p className="text-xs text-gray-500">Done</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{data.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      {/* Overall completion rate bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 font-medium">Completion Rate</span>
          <span className="text-xs font-semibold text-gray-700">{Math.round(data.completionRate)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${completionBarColor(data.completionRate)} rounded-full h-2 transition-all`}
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
      </div>

      {/* Overdue badge */}
      {data.overdue > 0 && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 mb-4">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {data.overdue} overdue
        </div>
      )}

      {/* Member breakdown */}
      {data.memberBreakdown.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Per Member
          </h4>
          <div className="space-y-2">
            {data.memberBreakdown.map((member) => (
              <div key={member.userId}>
                <div className="flex justify-between items-center text-xs mb-0.5">
                  <span className="text-gray-700 font-medium truncate mr-2">{member.name}</span>
                  <span className="text-gray-500">
                    {member.completed}/{member.totalAssigned}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`${completionBarColor(member.completionRate)} rounded-full h-1.5 transition-all`}
                    style={{ width: `${member.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.memberBreakdown.length === 0 && (
        <p className="text-xs text-gray-400">No member data available</p>
      )}
    </div>
  )
}
