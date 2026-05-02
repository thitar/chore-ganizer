import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

// Mock metrics module so register.metrics is controllable
jest.mock('../../utils/metrics', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: jest.fn(),
  },
}))

jest.mock('../../version', () => ({
  getVersion: jest.fn(() => '2.1.10'),
}))

import { getMetrics, getHealth } from '../../controllers/metrics.controller'

describe('Metrics Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getMetrics', () => {
    it('should return prometheus metrics with text/plain content type', async () => {
      const { register } = require('../../utils/metrics')
      const mockMetricsData = '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\n'
      ;(register.metrics as jest.Mock).mockResolvedValue(mockMetricsData)

      mockRes = {
        ...mockRes,
        set: jest.fn(),
        end: jest.fn(),
      } as any

      await getMetrics(mockReq as Request, mockRes as Response)

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', register.contentType)
      expect(mockRes.end).toHaveBeenCalledWith(mockMetricsData)
    })

    it('should return 500 on metrics generation error', async () => {
      const { register } = require('../../utils/metrics')
      const error = new Error('Metrics error')
      ;(register.metrics as jest.Mock).mockRejectedValue(error)

      mockRes = {
        ...mockRes,
        set: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any

      await getMetrics(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.end).toHaveBeenCalledWith(error)
    })
  })

  describe('getHealth', () => {
    it('should return health status with version and uptime', async () => {
      await getHealth(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '2.1.10',
      })
    })
  })
})
