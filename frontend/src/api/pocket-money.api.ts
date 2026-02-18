import apiClient from './client'
import type {
  PocketMoneyConfig,
  PointBalance,
  PointTransaction,
  Payout,
  ProjectedEarnings,
  TransactionType,
} from '../types/pocket-money'

export const pocketMoneyApi = {
  // Config
  getConfig: async (): Promise<PocketMoneyConfig> => {
    const response = await apiClient.get<{ config: PocketMoneyConfig }>('/pocket-money/config')
    return response.data?.config
  },

  updateConfig: async (data: Partial<PocketMoneyConfig>): Promise<PocketMoneyConfig> => {
    const response = await apiClient.put<{ config: PocketMoneyConfig }>('/pocket-money/config', data)
    return response.data?.config
  },

  // Balance
  getBalance: async (userId: number): Promise<PointBalance> => {
    const response = await apiClient.get<{ balance: PointBalance }>(`/pocket-money/balance/${userId}`)
    return response.data?.balance
  },

  // Transactions
  getTransactions: async (
    userId: number,
    params?: { type?: TransactionType; limit?: number; offset?: number }
  ): Promise<PointTransaction[]> => {
    const response = await apiClient.get<{ transactions: PointTransaction[] }>(
      `/pocket-money/transactions/${userId}`,
      { params }
    )
    return response.data?.transactions || []
  },

  // Bonus/Deduction
  addBonus: async (
    userId: number,
    amount: number,
    description?: string
  ): Promise<PointTransaction> => {
    const response = await apiClient.post<{ transaction: PointTransaction }>(
      '/pocket-money/bonus',
      { userId, amount, description }
    )
    return response.data?.transaction
  },

  addDeduction: async (
    userId: number,
    amount: number,
    description?: string
  ): Promise<PointTransaction> => {
    const response = await apiClient.post<{ transaction: PointTransaction }>(
      '/pocket-money/deduction',
      { userId, amount, description }
    )
    return response.data?.transaction
  },

  // Payouts
  getPayouts: async (userId: number): Promise<Payout[]> => {
    const response = await apiClient.get<{ payouts: Payout[] }>(`/pocket-money/payouts/${userId}`)
    return response.data?.payouts || []
  },

  createPayout: async (userId: number, points: number): Promise<Payout> => {
    const response = await apiClient.post<{ payout: Payout }>('/pocket-money/payout', {
      userId,
      points,
    })
    return response.data?.payout
  },

  // Projected
  getProjected: async (userId: number): Promise<ProjectedEarnings> => {
    const response = await apiClient.get<{ projected: ProjectedEarnings }>(
      `/pocket-money/projected/${userId}`
    )
    return response.data?.projected
  },
}
