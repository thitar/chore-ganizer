import React from 'react'
import type { PointTransaction, TransactionType } from '../../types/pocket-money'

interface PointHistoryListProps {
  transactions: PointTransaction[]
  isLoading?: boolean
  onFilterChange?: (type: TransactionType | 'ALL') => void
  selectedFilter?: TransactionType | 'ALL'
}

const transactionTypeConfig: Record<TransactionType, { label: string; icon: string; color: string }> = {
  EARNED: { label: 'Earned', icon: '✅', color: 'text-green-600 bg-green-50' },
  BONUS: { label: 'Bonus', icon: '🎁', color: 'text-green-600 bg-green-50' },
  DEDUCTION: { label: 'Deduction', icon: '➖', color: 'text-red-600 bg-red-50' },
  PENALTY: { label: 'Penalty', icon: '⚠️', color: 'text-red-600 bg-red-50' },
  PAYOUT: { label: 'Payout', icon: '💵', color: 'text-blue-600 bg-blue-50' },
  ADVANCE: { label: 'Advance', icon: '⏩', color: 'text-yellow-600 bg-yellow-50' },
  ADJUSTMENT: { label: 'Adjustment', icon: '🔧', color: 'text-gray-600 bg-gray-50' },
}

export const PointHistoryList: React.FC<PointHistoryListProps> = ({
  transactions,
  isLoading = false,
  onFilterChange,
  selectedFilter = 'ALL',
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const filters: Array<{ value: TransactionType | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'All' },
    { value: 'EARNED', label: 'Earned' },
    { value: 'BONUS', label: 'Bonus' },
    { value: 'DEDUCTION', label: 'Deductions' },
    { value: 'PAYOUT', label: 'Payouts' },
  ]

  const filteredTransactions =
    selectedFilter === 'ALL'
      ? transactions
      : transactions.filter((t) => t.type === selectedFilter)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">📜 Point History</h3>
        {onFilterChange && (
          <div className="flex gap-1 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onFilterChange(filter.value)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const config = transactionTypeConfig[transaction.type]
            const isPositive = ['EARNED', 'BONUS', 'ADJUSTMENT'].includes(transaction.type)

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                  <span className="text-lg">{config.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{config.label}</span>
                    {transaction.description && (
                      <span className="text-sm text-gray-500 truncate">- {transaction.description}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{transaction.amount.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
