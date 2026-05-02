/**
 * Pocket Money Balance Service Tests
 *
 * Covers:
 * - calculatePointBalance: aggregation logic, empty transactions, monetary value
 * - getPointBalance: user access control, return shape
 * - getTransactionHistory: filtering, pagination, running balance
 * - calculateProjectedEarnings: projections, period calculations
 */

import * as balanceService from '../../services/pocket-money/pocket-money-balance.service'
import { AppError } from '../../middleware/errorHandler'

// Mock config service
jest.mock('../../services/pocket-money/pocket-money-config.service', () => ({
  getOrCreateConfig: jest.fn(),
}))

import { getOrCreateConfig } from '../../services/pocket-money/pocket-money-config.service'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    pointTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    choreAssignment: {
      findMany: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'

describe('Pocket Money Balance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculatePointBalance', () => {
    it('should aggregate EARNED and BONUS transactions positively', async () => {
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([
        { id: 1, type: 'EARNED', amount: 10 },
        { id: 2, type: 'BONUS', amount: 5 },
      ])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        family: {
          pocketMoneyConfig: { pointValue: 10 },
        },
      })

      const result = await balanceService.calculatePointBalance(1)

      expect(result.totalPoints).toBe(15)
      expect(result.monetaryValue).toBeGreaterThan(0)
    })

    it('should subtract DEDUCTION, PENALTY, PAYOUT, ADVANCE, ADJUSTMENT', async () => {
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([
        { id: 1, type: 'EARNED', amount: 50 },
        { id: 2, type: 'DEDUCTION', amount: 10 },
        { id: 3, type: 'PENALTY', amount: 5 },
        { id: 4, type: 'PAYOUT', amount: 20 },
      ])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        family: {
          pocketMoneyConfig: { pointValue: 10 },
        },
      })

      const result = await balanceService.calculatePointBalance(1)

      // 50 - 10 - 5 - 20 = 15
      expect(result.totalPoints).toBe(15)
    })

    it('should return 0 points and 0 monetary value for empty transactions', async () => {
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        family: {
          pocketMoneyConfig: { pointValue: 10 },
        },
      })

      const result = await balanceService.calculatePointBalance(1)

      expect(result.totalPoints).toBe(0)
      expect(result.monetaryValue).toBe(0)
    })

    it('should use default point value of 10 when config is missing', async () => {
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([
        { id: 1, type: 'EARNED', amount: 100 },
      ])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        family: { pocketMoneyConfig: null },
      })

      const result = await balanceService.calculatePointBalance(1)

      expect(result.totalPoints).toBe(100)
      expect(result.monetaryValue).toBe(10) // 100 * (10/100) = 10
    })
  })

  describe('getPayoutPeriodStart', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z')) // Tuesday
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return start of current week for WEEKLY period', () => {
      const result = balanceService.getPayoutPeriodStart('WEEKLY')

      // Tuesday Jan 16 - 2 days = Sunday Jan 14
      expect(result.getDay()).toBe(0) // Sunday
    })

    it('should return first of current month for MONTHLY period', () => {
      const result = balanceService.getPayoutPeriodStart('MONTHLY')

      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(1)
    })
  })

  describe('getPointBalance', () => {
    it('should allow access when current user is the target', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        role: 'CHILD',
      })
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        role: 'CHILD',
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        family: { pocketMoneyConfig: { currency: 'EUR', pointValue: 10 } },
      })

      const result = await balanceService.getPointBalance(1, 1)

      expect(result.balance).toBeDefined()
      expect(result.balance.currency).toBe('EUR')
    })

    it('should allow PARENT to access child balance', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.pointTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 2,
        role: 'CHILD',
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 2,
        family: { pocketMoneyConfig: { currency: 'USD', pointValue: 10 } },
      })

      const result = await balanceService.getPointBalance(1, 2)

      expect(result.balance).toBeDefined()
      expect(result.balance.currency).toBe('USD')
    })

    it('should throw 403 when CHILD tries to access another user balance', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })

      await expect(
        balanceService.getPointBalance(2, 3)
      ).rejects.toThrow(AppError)

      try {
        await balanceService.getPointBalance(2, 3)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
      }
    })

    it('should throw 400 for invalid userId', async () => {
      await expect(
        balanceService.getPointBalance(1, NaN)
      ).rejects.toThrow('Invalid userId')
    })

    it('should throw 404 when target user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        balanceService.getPointBalance(1, 999)
      ).rejects.toThrow('User not found')
    })
  })

  describe('getTransactionHistory', () => {
    const mockTransactions = [
      {
        id: 1,
        userId: 2,
        type: 'EARNED',
        amount: 10,
        description: 'Completed chore',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        relatedUser: null,
        choreAssignment: null,
      },
    ]

    const mockAllPriorTx = [
      { type: 'EARNED', amount: 50 },
    ]

    beforeEach(() => {
      // Default mock setup for pagination
      ;(prisma.pointTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.pointTransaction.findMany as jest.Mock)
        // First call: page boundary tx
        .mockResolvedValueOnce([])
        // Second call: pagination boundary
        .mockResolvedValueOnce([])
        // Third call: actual transaction results
        .mockResolvedValueOnce(mockTransactions)
        // Fourth call: allPriorTx for running balance
        .mockResolvedValueOnce(mockAllPriorTx)
    })

    it('should return transactions with pagination', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })

      const result = await balanceService.getTransactionHistory(1, 2, {})

      expect(result.transactions).toBeDefined()
      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })

    it('should filter by transaction type', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      // Reset mocks for this specific test
      ;(prisma.pointTransaction.findMany as jest.Mock).mockReset()
      ;(prisma.pointTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.pointTransaction.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockTransactions)
        .mockResolvedValueOnce(mockAllPriorTx)

      await balanceService.getTransactionHistory(1, 2, { type: 'EARNED' })

      // Should have passed type to where clause
      const findManyCalls = (prisma.pointTransaction.findMany as jest.Mock).mock.calls
      const mainQueryCall = findManyCalls[2] // third call is actual transaction results
      expect(mainQueryCall[0].where.type).toBe('EARNED')
    })

    it('should filter by date range', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.pointTransaction.findMany as jest.Mock).mockReset()
      ;(prisma.pointTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.pointTransaction.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockTransactions)
        .mockResolvedValueOnce(mockAllPriorTx)

      await balanceService.getTransactionHistory(1, 2, {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      })

      const findManyCalls = (prisma.pointTransaction.findMany as jest.Mock).mock.calls
      const mainQueryCall = findManyCalls[2]
      expect(mainQueryCall[0].where.createdAt).toBeDefined()
      expect(mainQueryCall[0].where.createdAt.gte).toEqual(new Date('2024-01-01'))
      expect(mainQueryCall[0].where.createdAt.lte).toEqual(new Date('2024-01-31'))
    })

    it('should return empty transactions array when none exist', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.pointTransaction.findMany as jest.Mock).mockReset()
      ;(prisma.pointTransaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.pointTransaction.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await balanceService.getTransactionHistory(1, 2, {})

      expect(result.transactions).toEqual([])
      expect(result.pagination.total).toBe(0)
    })
  })

  describe('calculateProjectedEarnings', () => {
    it('should return projected earnings with current balance and period info', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        // First call: verifyUserAccess
        .mockResolvedValueOnce({ id: 1, role: 'PARENT' })
        // Second call: validate target user
        .mockResolvedValueOnce({
          id: 2,
          familyId: 'family-123',
          family: { pocketMoneyConfig: { pointValue: 10, currency: 'EUR', payoutPeriod: 'MONTHLY' } },
        })
        // Third call in calculatePointBalance: user.findUnique for config
        .mockResolvedValueOnce({
          id: 2,
          family: { pocketMoneyConfig: { pointValue: 10, currency: 'EUR' } },
        })
      ;(prisma.pointTransaction.findMany as jest.Mock)
        // First: transactions for balance (calculatePointBalance)
        .mockResolvedValueOnce([
          { id: 1, type: 'EARNED', amount: 50 },
        ])
        // Second: period transactions (calculateProjectedEarnings)
        .mockResolvedValueOnce([])

      ;(getOrCreateConfig as jest.Mock).mockResolvedValue({
        pointValue: 10,
        currency: 'EUR',
        payoutPeriod: 'MONTHLY',
        payoutDay: 1,
      })

      const result = await balanceService.calculateProjectedEarnings(1, 2)

      expect(result.currentBalance).toBeDefined()
      expect(result.currentPeriod).toBeDefined()
      expect(result.pointValue).toBe(10)
      expect(result.currency).toBe('EUR')
      expect(result.projectedEarnings).toBeDefined()
    })

    it('should throw 400 if user has no familyId', async () => {
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 1, role: 'PARENT' })
        .mockResolvedValueOnce({
          id: 2,
          familyId: null,
        })

      await expect(
        balanceService.calculateProjectedEarnings(1, 2)
      ).rejects.toThrow('User does not belong to a family')
    })
  })
})
