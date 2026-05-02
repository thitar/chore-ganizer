/**
 * Pocket Money Points Service Tests
 *
 * Covers:
 * - addBonus: transaction creation, amount validation, user lookup
 * - addDeduction: transaction creation, insufficient points, amount validation
 * - addAdvance: transaction creation, max advance limit, advance not enabled
 */

import * as pointsService from '../../services/pocket-money/pocket-money-points.service'

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
    pointTransaction: {
      create: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'

describe('Pocket Money Points Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('addBonus', () => {
    it('should create a BONUS transaction successfully', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })
      ;(prisma.pointTransaction.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        type: 'BONUS',
        amount: 10,
        description: 'Bonus points awarded',
        relatedUserId: 1,
      })

      const result = await pointsService.addBonus(1, 2, 10)

      expect(result.transaction).toBeDefined()
      expect(result.transaction.type).toBe('BONUS')
      expect(result.transaction.amount).toBe(10)
      expect(prisma.pointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 2,
          type: 'BONUS',
          amount: 10,
        }),
      })
    })

    it('should use custom description when provided', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })
      ;(prisma.pointTransaction.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        type: 'BONUS',
        amount: 5,
        description: 'Great behavior this week',
      })

      const result = await pointsService.addBonus(1, 2, 5, 'Great behavior this week')

      expect(result.transaction.description).toBe('Great behavior this week')
    })

    it('should throw 400 for amount <= 0', async () => {
      await expect(
        pointsService.addBonus(1, 2, 0)
      ).rejects.toThrow('Amount must be a positive number')

      await expect(
        pointsService.addBonus(1, 2, -5)
      ).rejects.toThrow('Amount must be a positive number')
    })

    it('should throw 404 when target user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        pointsService.addBonus(1, 999, 10)
      ).rejects.toThrow('Target user not found')
    })

    it('should throw 400 for invalid userId', async () => {
      await expect(
        pointsService.addBonus(1, NaN, 10)
      ).rejects.toThrow('Invalid userId')
    })
  })

  describe('addDeduction', () => {
    it('should create a DEDUCTION transaction with negative amount', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 50 })
      ;(prisma.pointTransaction.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        type: 'DEDUCTION',
        amount: -10,
        description: 'Points deducted',
      })

      const result = await pointsService.addDeduction(1, 2, 10)

      expect(result.transaction).toBeDefined()
      expect(result.transaction.type).toBe('DEDUCTION')
      expect(result.transaction.amount).toBe(-10)
    })

    it('should use custom description when provided', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 50 })
      ;(prisma.pointTransaction.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        type: 'DEDUCTION',
        amount: -10,
        description: 'Behavior deduction',
      })

      const result = await pointsService.addDeduction(1, 2, 10, 'Behavior deduction')

      expect(result.transaction.description).toBe('Behavior deduction')
    })

    it('should throw insufficient points error when balance < amount', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
      })
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 5 })

      await expect(
        pointsService.addDeduction(1, 2, 10)
      ).rejects.toThrow('Insufficient points for deduction')
    })

    it('should throw 400 for amount <= 0', async () => {
      await expect(
        pointsService.addDeduction(1, 2, 0)
      ).rejects.toThrow('Amount must be a positive number')
    })

    it('should throw 404 when target user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        pointsService.addDeduction(1, 999, 10)
      ).rejects.toThrow('Target user not found')
    })
  })

  describe('addAdvance', () => {
    it('should create an ADVANCE transaction with negative amount', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
        family: {
          pocketMoneyConfig: { allowAdvance: true, maxAdvancePoints: 50 },
        },
      })
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 30 })
      ;(prisma.pointTransaction.create as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        type: 'ADVANCE',
        amount: -20,
        description: 'Advance payment',
      })

      const result = await pointsService.addAdvance(1, 2, 20)

      expect(result.transaction).toBeDefined()
      expect(result.transaction.type).toBe('ADVANCE')
      expect(result.transaction.amount).toBe(-20)
    })

    it('should throw when advance exceeds maxAdvancePoints', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
        family: {
          pocketMoneyConfig: { allowAdvance: true, maxAdvancePoints: 50 },
        },
      })
      ;(calculatePointBalance as jest.Mock).mockResolvedValue({ totalPoints: 10 })

      // 10 - 70 = -60 which is less than -50
      await expect(
        pointsService.addAdvance(1, 2, 70)
      ).rejects.toThrow('Advance would exceed the maximum of 50 points')
    })

    it('should throw when advance is not enabled', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'CHILD',
        family: {
          pocketMoneyConfig: { allowAdvance: false, maxAdvancePoints: 50 },
        },
      })

      await expect(
        pointsService.addAdvance(1, 2, 20)
      ).rejects.toThrow('Advance payments are not enabled')
    })

    it('should throw 400 for amount <= 0', async () => {
      await expect(
        pointsService.addAdvance(1, 2, 0)
      ).rejects.toThrow('Amount must be a positive number')
    })

    it('should throw 404 when target user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        pointsService.addAdvance(1, 999, 20)
      ).rejects.toThrow('Target user not found')
    })
  })
})
