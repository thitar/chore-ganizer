import React, { useState, useEffect } from 'react'
import { useAuth, useUsers } from '../hooks'
import { pocketMoneyApi } from '../api'
import type { PointBalance, ProjectedEarnings, PointTransaction, TransactionType } from '../types/pocket-money'
import { PocketMoneyCard, PointHistoryList, PocketMoneyDashboard } from '../components/pocket-money'

export const PocketMoney: React.FC = () => {
  const { user, isParent } = useAuth()
  const { users } = useUsers()
  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [projected, setProjected] = useState<ProjectedEarnings | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<TransactionType | 'ALL'>('ALL')
  const [error, setError] = useState<string | null>(null)

  // Get family children (users with CHILD role)
  const familyChildren = users.filter((u) => u.role === 'CHILD')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const [balanceData, projectedData, transactionsData] = await Promise.all([
        pocketMoneyApi.getBalance(user.id),
        pocketMoneyApi.getProjected(user.id).catch(() => null),
        pocketMoneyApi.getTransactions(user.id, { limit: 20 }),
      ])

      setBalance(balanceData)
      setProjected(projectedData)
      setTransactions(transactionsData)
    } catch (err: any) {
      console.error('Failed to load pocket money data:', err)
      setError(err?.error?.message || 'Failed to load pocket money data')
    } finally {
      setIsLoading(false)
    }
  }

  // Parent view - show dashboard with all children
  if (isParent) {
    return <PocketMoneyDashboard children={familyChildren} currentUser={user!} />
  }

  // Child view - show own balance and history
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">💰 My Pocket Money</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
          <button onClick={loadData} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {/* Balance Card */}
      <PocketMoneyCard balance={balance} projected={projected} isLoading={isLoading} />

      {/* Transaction History */}
      <PointHistoryList
        transactions={transactions}
        isLoading={isLoading}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />
    </div>
  )
}
