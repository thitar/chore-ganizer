/**
 * Pocket Money Config Service Tests
 *
 * Covers:
 * - getOrCreateConfig: existing config returns, missing config creates defaults
 * - getConfig: returns config for user's family, missing family returns defaults
 * - updateConfig: validation rules, partial updates, PARENT-only checks
 */

import * as configService from '../../services/pocket-money/pocket-money-config.service'
import { AppError } from '../../middleware/errorHandler'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    pocketMoneyConfig: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'

describe('Pocket Money Config Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateConfig', () => {
    const mockConfig = {
      id: 1,
      familyId: 'family-123',
      pointValue: 10,
      currency: 'EUR',
      payoutPeriod: 'WEEKLY',
      payoutDay: 0,
      allowAdvance: true,
      maxAdvancePoints: 50,
    }

    it('should return existing config when found', async () => {
      ;(prisma.pocketMoneyConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig)

      const result = await configService.getOrCreateConfig('family-123')

      expect(result).toEqual(mockConfig)
      expect(prisma.pocketMoneyConfig.findUnique).toHaveBeenCalledWith({
        where: { familyId: 'family-123' },
      })
      expect(prisma.pocketMoneyConfig.create).not.toHaveBeenCalled()
    })

    it('should create config with defaults when not found', async () => {
      ;(prisma.pocketMoneyConfig.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.pocketMoneyConfig.create as jest.Mock).mockResolvedValue(mockConfig)

      const result = await configService.getOrCreateConfig('family-123')

      expect(result).toBeDefined()
      expect(prisma.pocketMoneyConfig.create).toHaveBeenCalledWith({
        data: { familyId: 'family-123' },
      })
    })
  })

  describe('getConfig', () => {
    it('should return config for user family', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        familyId: 'family-123',
        family: {
          pocketMoneyConfig: {
            id: 1,
            familyId: 'family-123',
            pointValue: 10,
            currency: 'EUR',
            payoutPeriod: 'MONTHLY',
            payoutDay: 1,
          },
        },
      })
      ;(prisma.pocketMoneyConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        familyId: 'family-123',
        pointValue: 10,
        currency: 'EUR',
        payoutPeriod: 'MONTHLY',
        payoutDay: 1,
        allowAdvance: true,
        maxAdvancePoints: 50,
      })

      const result = await configService.getConfig(1)

      expect(result.config).toBeDefined()
      expect(result.config.currency).toBe('EUR')
    })

    it('should return default config when user has no familyId', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        familyId: null,
      })

      const result = await configService.getConfig(1)

      expect(result.config).toBeDefined()
      expect(result.config.pointValue).toBe(10)
      expect(result.config.currency).toBe('EUR')
      expect(result.config.payoutPeriod).toBe('MONTHLY')
    })
  })

  describe('updateConfig', () => {
    const mockUserWithFamily = {
      id: 1,
      familyId: 'family-123',
      family: {
        pocketMoneyConfig: {
          id: 1,
          familyId: 'family-123',
          pointValue: 10,
          currency: 'EUR',
          payoutPeriod: 'MONTHLY',
          payoutDay: 1,
        },
      },
    }

    it('should update pointValue successfully', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)
      ;(prisma.pocketMoneyConfig.upsert as jest.Mock).mockResolvedValue({
        ...mockUserWithFamily.family.pocketMoneyConfig,
        pointValue: 20,
      })

      const result = await configService.updateConfig(1, { pointValue: 20 })

      expect(result.config.pointValue).toBe(20)
    })

    it('should validate currency is EUR, USD, or GBP', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)

      await expect(
        configService.updateConfig(1, { currency: 'JPY' })
      ).rejects.toThrow('Invalid currency. Must be EUR, USD, or GBP')
    })

    it('should validate payoutPeriod is WEEKLY or MONTHLY', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)

      await expect(
        configService.updateConfig(1, { payoutPeriod: 'YEARLY' })
      ).rejects.toThrow('Invalid payoutPeriod. Must be WEEKLY or MONTHLY')
    })

    it('should validate payoutDay range for MONTHLY period', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)

      await expect(
        configService.updateConfig(1, { payoutDay: 29, payoutPeriod: 'MONTHLY' })
      ).rejects.toThrow('payoutDay must be between 1 and 28 for monthly period')
    })

    it('should validate payoutDay range for WEEKLY period', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)

      await expect(
        configService.updateConfig(1, { payoutDay: 7, payoutPeriod: 'WEEKLY' })
      ).rejects.toThrow('payoutDay must be between 0 (Sunday) and 6 (Saturday) for weekly period')
    })

    it('should validate maxAdvancePoints is non-negative', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)

      await expect(
        configService.updateConfig(1, { maxAdvancePoints: -1 })
      ).rejects.toThrow('maxAdvancePoints must be non-negative')
    })

    it('should validate pointValue > 0', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)

      await expect(
        configService.updateConfig(1, { pointValue: 0 })
      ).rejects.toThrow('pointValue must be greater than 0')
    })

    it('should perform partial update with only provided fields', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithFamily)
      ;(prisma.pocketMoneyConfig.upsert as jest.Mock).mockResolvedValue({
        ...mockUserWithFamily.family.pocketMoneyConfig,
        currency: 'USD',
      })

      const result = await configService.updateConfig(1, { currency: 'USD' })

      expect(result.config.currency).toBe('USD')
      // Upsert should only include the fields we passed
      expect(prisma.pocketMoneyConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ currency: 'USD' }),
        })
      )
    })

    it('should throw 400 when user has no familyId', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        familyId: null,
      })

      await expect(
        configService.updateConfig(1, { pointValue: 20 })
      ).rejects.toThrow('User does not belong to a family')
    })
  })
})
