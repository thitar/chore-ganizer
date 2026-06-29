import React from 'react'
import { Loading, ErrorDisplay } from '../common'

interface MemberBalance {
  userId: number
  name: string
  balance: number
}

export interface PointSummaryData {
  memberBalances: MemberBalance[]
  totalEarnedThisPeriod: number
  totalSpentThisPeriod: number
}

interface PointSummaryCardProps {
  data: PointSummaryData | null
  loading: boolean
  error: string | null
}

export const PointSummaryCard: React.FC<PointSummaryCardProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading point summary..." />
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
        <p className="text-gray-500 text-sm">No point data</p>
      </div>
    )
  }

  const maxBalance = Math.max(...data.memberBalances.map((m) => m.balance), 1)

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Point Summary</h3>

      {/* Period totals */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-700">+{data.totalEarnedThisPeriod}</p>
          <p className="text-xs text-green-600">Earned</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-700">{data.totalSpentThisPeriod}</p>
          <p className="text-xs text-red-600">Spent</p>
        </div>
      </div>

      {/* Member balances */}
      {data.memberBalances.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Balances
          </h4>
          <div className="space-y-2">
            {data.memberBalances.map((member) => (
              <div key={member.userId}>
                <div className="flex justify-between items-center text-xs mb-0.5">
                  <span className="text-gray-700 font-medium truncate mr-2">{member.name}</span>
                  <span className="font-semibold text-gray-900">{member.balance}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 rounded-full h-1.5 transition-all"
                    style={{ width: `${Math.min((member.balance / maxBalance) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.memberBalances.length === 0 && (
        <p className="text-xs text-gray-400">No member balances</p>
      )}
    </div>
  )
}
