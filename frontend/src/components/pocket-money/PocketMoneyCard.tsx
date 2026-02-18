import React from 'react'
import type { PointBalance, ProjectedEarnings } from '../../types/pocket-money'

interface PocketMoneyCardProps {
  balance: PointBalance | null
  projected: ProjectedEarnings | null
  isLoading?: boolean
}

export const PocketMoneyCard: React.FC<PocketMoneyCardProps> = ({
  balance,
  projected,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (!balance) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-500 text-center">No pocket money data available</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balance.currency,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 Pocket Money</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Balance */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Current Balance</p>
          <p className="text-3xl font-bold text-blue-700">{balance.points.toLocaleString()}</p>
          <p className="text-sm text-blue-500">points</p>
        </div>

        {/* Monetary Value */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Value</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(balance.monetaryValue)}</p>
          <p className="text-sm text-green-500">worth</p>
        </div>
      </div>

      {/* Projected Earnings */}
      {projected && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-600 mb-2">📈 This Period</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Earned</p>
              <p className="text-lg font-semibold text-gray-800">
                {projected.earnedThisPeriod.toLocaleString()} pts
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Projected Total</p>
              <p className="text-lg font-semibold text-gray-800">
                {projected.projectedTotal.toLocaleString()} pts
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Projected Value</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(projected.projectedValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Period Ends</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(projected.periodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
