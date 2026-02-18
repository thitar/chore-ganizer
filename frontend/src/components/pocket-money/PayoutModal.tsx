import React, { useState } from 'react'
import { pocketMoneyApi } from '../../api'
import type { User } from '../../types'
import type { PointBalance } from '../../types/pocket-money'

interface PayoutModalProps {
  child: User
  balance: PointBalance | null
  onClose: () => void
  onSuccess: () => void
}

export const PayoutModal: React.FC<PayoutModalProps> = ({ child, balance, onClose, onSuccess }) => {
  const [points, setPoints] = useState<number>(balance?.points || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!balance || points <= 0) {
      setError('Please enter a valid number of points')
      return
    }

    if (points > balance.points) {
      setError('Cannot payout more than the current balance')
      return
    }

    setIsSubmitting(true)

    try {
      await pocketMoneyApi.createPayout(child.id, points)
      onSuccess()
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to create payout')
    } finally {
      setIsSubmitting(false)
    }
  }

  const amount = balance ? (points / 100) * (balance.monetaryValue / balance.points) * 100 : 0
  const formatCurrency = (amt: number) => {
    if (!balance) return `$${amt.toFixed(2)}`
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balance.currency,
    }).format(amt)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">💵 Create Payout</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Child Info */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: child.color || '#6B7280' }}
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-800">{child.name}</p>
              <p className="text-sm text-gray-500">
                Available: {balance?.points.toLocaleString() || 0} points
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Points Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points to Payout
              </label>
              <input
                type="number"
                min="1"
                max={balance?.points || 0}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPoints(Math.floor((balance?.points || 0) / 2))}
                  className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Half
                </button>
                <button
                  type="button"
                  onClick={() => setPoints(balance?.points || 0)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  All
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Payout Amount:</span>
                <span className="text-xl font-bold text-blue-700">{formatCurrency(amount)}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {points} points at {(balance?.monetaryValue || 0) / (balance?.points || 1) * 100}/point
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !balance || points <= 0 || points > balance.points}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Payout'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
