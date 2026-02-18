import React, { useState, useEffect } from 'react'
import { pocketMoneyApi } from '../../api'
import type { User } from '../../types'
import type { PointBalance, PocketMoneyConfig, PointTransaction, Payout } from '../../types/pocket-money'
import { PocketMoneyCard } from './PocketMoneyCard'
import { PointHistoryList } from './PointHistoryList'
import { BonusDeductionModal } from './BonusDeductionModal'
import { PayoutModal } from './PayoutModal'
import { ConfigurationForm } from './ConfigurationForm'

interface ChildBalance {
  user: User
  balance: PointBalance
}

interface PocketMoneyDashboardProps {
  children: User[]
  currentUser: User
}

export const PocketMoneyDashboard: React.FC<PocketMoneyDashboardProps> = ({ children, currentUser }) => {
  const [childBalances, setChildBalances] = useState<ChildBalance[]>([])
  const [config, setConfig] = useState<PocketMoneyConfig | null>(null)
  const [selectedChild, setSelectedChild] = useState<User | null>(null)
  const [showBonusDeduction, setShowBonusDeduction] = useState(false)
  const [showPayout, setShowPayout] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      // Load config
      const configData = await pocketMoneyApi.getConfig()
      setConfig(configData)

      // Load balances for all children
      const balances = await Promise.all(
        children.map(async (child) => {
          try {
            const balance = await pocketMoneyApi.getBalance(child.id)
            return { user: child, balance: balance || { points: 0, monetaryValue: 0, currency: 'EUR' } }
          } catch (error) {
            console.error(`Failed to load balance for user ${child.id}:`, error)
            return { user: child, balance: { points: 0, monetaryValue: 0, currency: 'EUR' } }
          }
        })
      )
      setChildBalances(balances)

      // Load recent transactions (from first child if exists)
      if (children.length > 0) {
        const txns = await pocketMoneyApi.getTransactions(children[0].id, { limit: 10 })
        setTransactions(txns)

        const pymnts = await pocketMoneyApi.getPayouts(children[0].id)
        setPayouts(pymnts)
      }
    } catch (error) {
      console.error('Failed to load pocket money data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChildSelect = async (child: User) => {
    setSelectedChild(child)
    try {
      const [txns, pymnts] = await Promise.all([
        pocketMoneyApi.getTransactions(child.id, { limit: 10 }),
        pocketMoneyApi.getPayouts(child.id),
      ])
      setTransactions(txns)
      setPayouts(pymnts)
    } catch (error) {
      console.error('Failed to load child data:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    if (!config) return `$${amount.toFixed(2)}`
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: config.currency,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">💰 Pocket Money Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ⚙️ Configure
          </button>
        </div>
      </div>

      {/* Config Summary */}
      {config && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Point Value:</span>{' '}
              <span className="font-medium">{formatCurrency(config.pointValue / 100)}/point</span>
            </div>
            <div>
              <span className="text-gray-500">Payout:</span>{' '}
              <span className="font-medium">{config.payoutPeriod} (Day {config.payoutDay})</span>
            </div>
            <div>
              <span className="text-gray-500">Advance:</span>{' '}
              <span className="font-medium">
                {config.allowAdvance ? `Up to ${config.maxAdvancePoints} pts` : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))
          : childBalances.map(({ user, balance }) => (
              <div
                key={user.id}
                onClick={() => handleChildSelect(user)}
                className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                  selectedChild?.id === user.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: user.color || '#6B7280' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{user.name}</h3>
                    <p className="text-xs text-gray-500">Child</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Points</p>
                    <p className="text-xl font-bold text-blue-600">{balance.points.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Value</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(balance.monetaryValue)}</p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Selected Child Actions & History */}
      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PointHistoryList transactions={transactions} isLoading={isLoading} />
          </div>
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowBonusDeduction(true)}
                  className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-left"
                >
                  🎁 Add Bonus
                </button>
                <button
                  onClick={() => setShowBonusDeduction(true)}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-left"
                >
                  ➖ Add Deduction
                </button>
                <button
                  onClick={() => setShowPayout(true)}
                  className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-left"
                >
                  💵 Create Payout
                </button>
              </div>
            </div>

            {/* Recent Payouts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">💸 Recent Payouts</h3>
              {payouts.length === 0 ? (
                <p className="text-gray-500 text-sm">No payouts yet</p>
              ) : (
                <div className="space-y-2">
                  {payouts.slice(0, 5).map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {payout.points.toLocaleString()} pts
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          payout.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : payout.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {payout.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBonusDeduction && config && (
        <BonusDeductionModal
          children={children}
          selectedChild={selectedChild}
          onClose={() => setShowBonusDeduction(false)}
          onSuccess={() => {
            setShowBonusDeduction(false)
            loadData()
          }}
        />
      )}

      {showPayout && config && selectedChild && (
        <PayoutModal
          child={selectedChild}
          balance={childBalances.find((b) => b.user.id === selectedChild.id)?.balance || null}
          onClose={() => setShowPayout(false)}
          onSuccess={() => {
            setShowPayout(false)
            loadData()
          }}
        />
      )}

      {showConfig && config && (
        <ConfigurationForm
          config={config}
          onClose={() => setShowConfig(false)}
          onSuccess={() => {
            setShowConfig(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
