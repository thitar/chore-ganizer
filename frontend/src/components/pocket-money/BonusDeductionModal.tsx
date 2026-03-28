import React, { useState } from 'react'
import { pocketMoneyApi } from '../../api'
import type { User } from '../../types'
import type { PocketMoneyConfig } from '../../types/pocket-money'

interface BonusDeductionModalProps {
  children: User[]
  selectedChild: User | null
  config: PocketMoneyConfig
  onClose: () => void
  onSuccess: () => void
}

export const BonusDeductionModal: React.FC<BonusDeductionModalProps> = ({
  children,
  selectedChild,
  config,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<'BONUS' | 'DEDUCTION' | 'ADVANCE'>('BONUS')
  const [userId, setUserId] = useState<number>(selectedChild?.id || (children.length > 0 ? children[0].id : 0))
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!amount || parseInt(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setIsSubmitting(true)

    try {
      if (type === 'BONUS') {
        await pocketMoneyApi.addBonus(userId, parseInt(amount), description || undefined)
      } else if (type === 'DEDUCTION') {
        await pocketMoneyApi.addDeduction(userId, parseInt(amount), description || undefined)
      } else {
        await pocketMoneyApi.addAdvance(userId, parseInt(amount), description || undefined)
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.error?.message || `Failed to add ${type.toLowerCase()}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {type === 'BONUS' ? '🎁 Add Bonus' : type === 'DEDUCTION' ? '➖ Add Deduction' : '💳 Grant Advance'}
            </h2>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('BONUS')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  type === 'BONUS'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎁 Bonus
              </button>
              <button
                type="button"
                onClick={() => setType('DEDUCTION')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  type === 'DEDUCTION'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ➖ Deduction
              </button>
              {config.allowAdvance && (
                <button
                  type="button"
                  onClick={() => setType('ADVANCE')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    type === 'ADVANCE'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💳 Advance
                </button>
              )}
            </div>

            {/* User Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Child
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter points"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Good behavior, Extra chores"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                disabled={isSubmitting || children.length === 0}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  type === 'BONUS'
                    ? 'bg-green-600 hover:bg-green-700'
                    : type === 'DEDUCTION'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isSubmitting
                  ? 'Adding...'
                  : type === 'BONUS'
                  ? 'Add Bonus'
                  : type === 'DEDUCTION'
                  ? 'Add Deduction'
                  : 'Grant Advance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
