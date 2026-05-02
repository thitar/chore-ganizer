/**
 * Pocket Money Payouts Service Tests
 *
 * Covers:
 * - getPayouts: filtering by userId, status, return shape
 * - createPayout: payout creation, transaction creation, balance checks
 */

import * as payoutsService from '../../services/pocket-money/pocket-money-payouts.service'

// Mock balance service
jest.mock('../../services/pocket-money/pocket-money-balance.service', () => ({
  calculatePointBalance: jest.fn(),
}))

import { calculatePointBalance } from '../../services/pocket-money/pocket-money-balance.service'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    payout: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    pointTransaction: {
      create: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'

describe('Pocket Money Payouts Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPayouts', () => {
    const mockPayouts = [
      {
        id: 1,
        userId: 2,
        points: 50,
        amount: 500,
        status: 'PAID',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        paidAt: new Date('2024-02-01'),
      },
    ]

    it('should return payouts for a user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.payout.findMany as jest.Mock).mockResolvedValue(mockPayouts)

      const result = await payoutsService.getPayouts(1, 2)

      expect(result.payouts).toBeDefined()
      expect(result.payouts).toHaveLength(1)
      expect(prisma.payout.findMany).toHaveBeenCalledWith({
        where: { userId: 2 },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter payouts by status when provided', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.payout.findMany as jest.Mock).mockResolvedValue(mockPayouts)

      await payoutsService.getPayouts(1, 2, 'PAID')

      expect(prisma.payout.findMany).toHaveBeenCalledWith({
        where: { userId: 2, status: 'PAID' },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return all payouts when status filter is omitted', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.payout.findMany as jest.Mock).mockResolvedValue(mockPayouts)

      const result = await payoutsService.getPayouts(1, 2)

      expect(result.payouts).toHaveLength(1)
      const findManyCall = (prisma.payout.findMany as jest.Mock).mock.calls[0][0]
      expect(findManyCall.where.status).toBeUndefined()
    })

    it('should throw 400 for invalid userId', async () => {
      await expect(
        payoutsService.getPayouts(1, NaN)
      ).rejects.toThrow('Invalid userId')
    })

    it('should reject CHILD accessing another user payout', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })

      await expect(
        payoutsService.getPayouts(2, 3)
      ).rejects.toThrow('Unauthorized')
    })

    it('should return empty payouts array when none exist', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'PARENT',
      })
      ;(prisma.payout.findMany as jest.Mock).mockResolvedValue([])

      const result = await payoutsService.getPayouts(1, 2)

      expect(result.payouts).toEqual([])
    })
  })

  describe('createPayout', () => {
    const mockTargetUser = {
      id: 2,
      role: 'CHILD',
      family: {
        pocketMoneyConfig: { pointValue: 10 },
      },
    }

    it('should create a payout and corresponding transaction', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTargetUser)
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 100 })
      ;(prisma.payout.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        points: 50,
        amount: 500,
        status: 'PAID',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      })
      ;(prisma.pointTransaction.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        type: 'PAYOUT',
        amount: -50,
      })

      const result = await payoutsService.createPayout(
        1, 2, 50,
        '2024-01-01', '2024-01-31'
      )

      expect(result.payout).toBeDefined()
      expect(result.payout.status).toBe('PAID')
      expect(prisma.payout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 2,
            points: 50,
          }),
        })
      )
      expect(prisma.pointTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PAYOUT',
            amount: -50,
          }),
        })
      )
    })

    it('should throw 400 for points <= 0', async () => {
      await expect(
        payoutsService.createPayout(1, 2, 0, '2024-01-01', '2024-01-31')
      ).rejects.toThrow('Points must be a positive number')
    })

    it('should throw 400 for missing periodStart or periodEnd', async () => {
      await expect(
        payoutsService.createPayout(1, 2, 50, '', '2024-01-31')
      ).rejects.toThrow('periodStart and periodEnd are required')
    })

    it('should throw 404 when target user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        payoutsService.createPayout(1, 999, 50, '2024-01-01', '2024-01-31')
      ).rejects.toThrow('Target user not found')
    })

    it('should throw insufficient balance when points exceed balance', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTargetUser)
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 30 })

      await expect(
        payoutsService.createPayout(1, 2, 50, '2024-01-01', '2024-01-31')
      ).rejects.toThrow('Insufficient points for payout')
    })

    it('should throw 400 for invalid userId', async () => {
      await expect(
        payoutsService.createPayout(1, NaN, 50, '2024-01-01', '2024-01-31')
      ).rejects.toThrow('Invalid userId')
    })
  })
})
