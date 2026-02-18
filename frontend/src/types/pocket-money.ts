import type { User } from './index'

export type PayoutPeriod = 'WEEKLY' | 'MONTHLY'
export type TransactionType = 'EARNED' | 'BONUS' | 'DEDUCTION' | 'PENALTY' | 'PAYOUT' | 'ADVANCE' | 'ADJUSTMENT'
export type PayoutStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export interface PocketMoneyConfig {
  id: number
  familyId: string
  pointValue: number // cents per point
  currency: string
  payoutPeriod: PayoutPeriod
  payoutDay: number
  allowAdvance: boolean
  maxAdvancePoints: number
}

export interface PointTransaction {
  id: number
  userId: number
  type: TransactionType
  amount: number
  description: string | null
  choreAssignmentId: number | null
  relatedUserId: number | null
  createdAt: string
  // Relations
  user?: User
  relatedUser?: User
}

export interface Payout {
  id: number
  userId: number
  periodStart: string
  periodEnd: string
  points: number
  amount: number
  status: PayoutStatus
  paidAt: string | null
  createdAt: string
  user?: User
}

export interface PointBalance {
  points: number
  monetaryValue: number // in currency units
  currency: string
}

export interface ProjectedEarnings {
  currentBalance: number
  earnedThisPeriod: number
  projectedTotal: number
  projectedValue: number
  currency: string
  periodEnd: string
}

// API Response types
export interface PocketMoneyConfigResponse {
  config: PocketMoneyConfig
}

export interface PointBalanceResponse {
  balance: PointBalance
}

export interface PointTransactionsResponse {
  transactions: PointTransaction[]
}

export interface PayoutsResponse {
  payouts: Payout[]
}

export interface ProjectedEarningsResponse {
  projected: ProjectedEarnings
}

export interface PointTransactionResponse {
  transaction: PointTransaction
}

export interface PayoutResponse {
  payout: Payout
}
