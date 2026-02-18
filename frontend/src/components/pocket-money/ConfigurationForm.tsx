import React, { useState } from 'react'
import { pocketMoneyApi } from '../../api'
import type { PocketMoneyConfig, PayoutPeriod } from '../../types/pocket-money'

interface ConfigurationFormProps {
  config: PocketMoneyConfig
  onClose: () => void
  onSuccess: () => void
}

export const ConfigurationForm: React.FC<ConfigurationFormProps> = ({ config, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    pointValue: config.pointValue,
    currency: config.currency,
    payoutPeriod: config.payoutPeriod,
    payoutDay: config.payoutDay,
    allowAdvance: config.allowAdvance,
    maxAdvancePoints: config.maxAdvancePoints,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await pocketMoneyApi.updateConfig(formData)
      onSuccess()
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to update configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currencyOptions = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">⚙️ Pocket Money Settings</h2>
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
            {/* Point Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Point Value (cents per point)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.pointValue}
                onChange={(e) => setFormData({ ...formData, pointValue: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                ${(formData.pointValue / 100).toFixed(2)} per point
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {currencyOptions.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>

            {/* Payout Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payout Period
              </label>
              <select
                value={formData.payoutPeriod}
                onChange={(e) => setFormData({ ...formData, payoutPeriod: e.target.value as PayoutPeriod })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            {/* Payout Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.payoutPeriod === 'WEEKLY' ? 'Payout Day of Week' : 'Payout Day of Month'}
              </label>
              <select
                value={formData.payoutDay}
                onChange={(e) => setFormData({ ...formData, payoutDay: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {formData.payoutPeriod === 'WEEKLY' ? (
                  <>
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </>
                ) : (
                  Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Allow Advance */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Allow Advance Payments</label>
                <p className="text-xs text-gray-500">Let children request early payment</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, allowAdvance: !formData.allowAdvance })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.allowAdvance ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.allowAdvance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Max Advance Points */}
            {formData.allowAdvance && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Advance Points
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.maxAdvancePoints}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAdvancePoints: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

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
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
