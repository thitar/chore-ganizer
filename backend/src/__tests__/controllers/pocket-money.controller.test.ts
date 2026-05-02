import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/pocket-money/pocket-money-config.service', () => ({
  getConfig: jest.fn(),
  updateConfig: jest.fn(),
}))

jest.mock('../../services/pocket-money/pocket-money-balance.service', () => ({
  getPointBalance: jest.fn(),
  getTransactionHistory: jest.fn(),
  calculateProjectedEarnings: jest.fn(),
}))

jest.mock('../../services/pocket-money/pocket-money-points.service', () => ({
  addBonus: jest.fn(),
  addDeduction: jest.fn(),
  addAdvance: jest.fn(),
}))

jest.mock('../../services/pocket-money/pocket-money-payouts.service', () => ({
  getPayouts: jest.fn(),
  createPayout: jest.fn(),
}))

import * as configService from '../../services/pocket-money/pocket-money-config.service'
import * as balanceService from '../../services/pocket-money/pocket-money-balance.service'
import * as pointsService from '../../services/pocket-money/pocket-money-points.service'
import * as payoutsService from '../../services/pocket-money/pocket-money-payouts.service'
import * as pocketMoneyController from '../../controllers/pocket-money.controller'

// Helper to create minimal user object (type is too strict for inline)
const parentUser = { id: 1, role: 'PARENT' as const, email: 'p@t.com', name: 'P', points: 0, color: '#000' }

describe('Pocket Money Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getConfig', () => {
    it('should return 200 with config on success', async () => {
      const mockConfig = { enabled: true, maxPayout: 100 }
      ;(configService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      mockReq = createMockRequest({ user: parentUser })

      await pocketMoneyController.getConfig(mockReq as Request, mockRes as Response)

      expect(configService.getConfig).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockConfig })
    })

    it('should propagate service errors', async () => {
      ;(configService.getConfig as jest.Mock).mockRejectedValue(new Error('Config error'))

      mockReq = createMockRequest({ user: parentUser })

      await expect(
        pocketMoneyController.getConfig(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Config error')
    })
  })

  describe('updateConfig', () => {
    it('should return 200 with updated config on success', async () => {
      const updatedConfig = { enabled: false, maxPayout: 50 }
      ;(configService.updateConfig as jest.Mock).mockResolvedValue(updatedConfig)

      mockReq = createMockRequest({
        user: parentUser,
        body: { enabled: false, maxPayout: 50 },
      })

      await pocketMoneyController.updateConfig(mockReq as Request, mockRes as Response)

      expect(configService.updateConfig).toHaveBeenCalledWith(1, { enabled: false, maxPayout: 50 })
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updatedConfig })
    })

    it('should propagate service errors', async () => {
      ;(configService.updateConfig as jest.Mock).mockRejectedValue(new Error('Update error'))

      mockReq = createMockRequest({
        user: parentUser,
        body: { enabled: false },
      })

      await expect(
        pocketMoneyController.updateConfig(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Update error')
    })
  })

  describe('getPointBalance', () => {
    it('should return 200 with balance on success', async () => {
      const mockBalance = { points: 150, userId: 2 }
      ;(balanceService.getPointBalance as jest.Mock).mockResolvedValue(mockBalance)

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
      })

      await pocketMoneyController.getPointBalance(mockReq as Request, mockRes as Response)

      expect(balanceService.getPointBalance).toHaveBeenCalledWith(1, 2)
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockBalance })
    })

    it('should propagate service errors', async () => {
      ;(balanceService.getPointBalance as jest.Mock).mockRejectedValue(new Error('Balance error'))

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
      })

      await expect(
        pocketMoneyController.getPointBalance(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Balance error')
    })
  })

  describe('getTransactionHistory', () => {
    it('should return 200 with transactions on success', async () => {
      const mockTransactions = [{ id: 1, amount: 10, type: 'EARNED' }]
      ;(balanceService.getTransactionHistory as jest.Mock).mockResolvedValue(mockTransactions)

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
        query: { status: 'all' },
      })

      await pocketMoneyController.getTransactionHistory(mockReq as Request, mockRes as Response)

      expect(balanceService.getTransactionHistory).toHaveBeenCalledWith(1, 2, { status: 'all' })
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockTransactions })
    })

    it('should propagate service errors', async () => {
      ;(balanceService.getTransactionHistory as jest.Mock).mockRejectedValue(new Error('Tx error'))

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
      })

      await expect(
        pocketMoneyController.getTransactionHistory(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Tx error')
    })
  })

  describe('addBonus', () => {
    it('should return 201 with result on success', async () => {
      const mockResult = { id: 1, amount: 20, type: 'BONUS' }
      ;(pointsService.addBonus as jest.Mock).mockResolvedValue(mockResult)

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', amount: 20, description: 'Great work!' },
      })

      await pocketMoneyController.addBonus(mockReq as Request, mockRes as Response)

      expect(pointsService.addBonus).toHaveBeenCalledWith(1, 2, 20, 'Great work!')
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockResult })
    })

    it('should propagate service errors', async () => {
      ;(pointsService.addBonus as jest.Mock).mockRejectedValue(new Error('Points error'))

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', amount: 20, description: 'Great work!' },
      })

      await expect(
        pocketMoneyController.addBonus(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Points error')
    })
  })

  describe('addDeduction', () => {
    it('should return 201 with result on success', async () => {
      const mockResult = { id: 2, amount: -10, type: 'DEDUCTION' }
      ;(pointsService.addDeduction as jest.Mock).mockResolvedValue(mockResult)

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', amount: 10, description: 'Misbehavior' },
      })

      await pocketMoneyController.addDeduction(mockReq as Request, mockRes as Response)

      expect(pointsService.addDeduction).toHaveBeenCalledWith(1, 2, 10, 'Misbehavior')
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should propagate service errors', async () => {
      ;(pointsService.addDeduction as jest.Mock).mockRejectedValue(new Error('Deduction error'))

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', amount: 10 },
      })

      await expect(
        pocketMoneyController.addDeduction(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Deduction error')
    })
  })

  describe('addAdvance', () => {
    it('should return 201 with result on success', async () => {
      const mockResult = { id: 3, amount: 50, type: 'ADVANCE' }
      ;(pointsService.addAdvance as jest.Mock).mockResolvedValue(mockResult)

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', amount: 50, description: 'Advance for chores' },
      })

      await pocketMoneyController.addAdvance(mockReq as Request, mockRes as Response)

      expect(pointsService.addAdvance).toHaveBeenCalledWith(1, 2, 50, 'Advance for chores')
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should propagate service errors', async () => {
      ;(pointsService.addAdvance as jest.Mock).mockRejectedValue(new Error('Advance error'))

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', amount: 50 },
      })

      await expect(
        pocketMoneyController.addAdvance(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Advance error')
    })
  })

  describe('getPayouts', () => {
    it('should return 200 with payouts on success', async () => {
      const mockPayouts = [{ id: 1, amount: 50, status: 'PAID' }]
      ;(payoutsService.getPayouts as jest.Mock).mockResolvedValue(mockPayouts)

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
        query: { status: 'PAID' },
      })

      await pocketMoneyController.getPayouts(mockReq as Request, mockRes as Response)

      expect(payoutsService.getPayouts).toHaveBeenCalledWith(1, 2, 'PAID')
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockPayouts })
    })

    it('should propagate service errors', async () => {
      ;(payoutsService.getPayouts as jest.Mock).mockRejectedValue(new Error('Payout error'))

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
      })

      await expect(
        pocketMoneyController.getPayouts(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Payout error')
    })
  })

  describe('createPayout', () => {
    it('should return 201 with created payout on success', async () => {
      const mockPayout = { id: 1, userId: 2, points: 100, periodStart: '2024-01-01', periodEnd: '2024-01-31' }
      ;(payoutsService.createPayout as jest.Mock).mockResolvedValue(mockPayout)

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', points: 100, periodStart: '2024-01-01', periodEnd: '2024-01-31' },
      })

      await pocketMoneyController.createPayout(mockReq as Request, mockRes as Response)

      expect(payoutsService.createPayout).toHaveBeenCalledWith(1, 2, 100, '2024-01-01', '2024-01-31')
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockPayout })
    })

    it('should propagate service errors', async () => {
      ;(payoutsService.createPayout as jest.Mock).mockRejectedValue(new Error('Create error'))

      mockReq = createMockRequest({
        user: parentUser,
        body: { userId: '2', points: 100, periodStart: '2024-01-01', periodEnd: '2024-01-31' },
      })

      await expect(
        pocketMoneyController.createPayout(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Create error')
    })
  })

  describe('calculateProjectedEarnings', () => {
    it('should return 200 with projected earnings on success', async () => {
      const mockProjection = { weekly: 20, monthly: 80 }
      ;(balanceService.calculateProjectedEarnings as jest.Mock).mockResolvedValue(mockProjection)

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
      })

      await pocketMoneyController.calculateProjectedEarnings(mockReq as Request, mockRes as Response)

      expect(balanceService.calculateProjectedEarnings).toHaveBeenCalledWith(1, 2)
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockProjection })
    })

    it('should propagate service errors', async () => {
      ;(balanceService.calculateProjectedEarnings as jest.Mock).mockRejectedValue(new Error('Projection error'))

      mockReq = createMockRequest({
        user: parentUser,
        params: { userId: '2' },
      })

      await expect(
        pocketMoneyController.calculateProjectedEarnings(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Projection error')
    })
  })
})
