import { createMockRequest, createMockResponse } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/audit.service', () => ({
  getAuditLogs: jest.fn(),
}))

import * as auditService from '../../services/audit.service'
import { getAuditLogs } from '../../controllers/audit.controller'

describe('Audit Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getAuditLogs', () => {
    it('should return 200 with audit logs on success', async () => {
      const mockLogs = [
        { id: 1, action: 'USER_LOGIN', userId: 1 },
        { id: 2, action: 'USER_LOGOUT', userId: 1 },
      ]
      ;(auditService.getAuditLogs as jest.Mock).mockResolvedValue({
        logs: mockLogs,
        total: 2,
      })

      mockReq = createMockRequest({
        query: {
          userId: '1',
          action: 'USER_LOGIN',
          entityType: 'User',
          page: '1',
          limit: '50',
        },
      })

      await getAuditLogs(mockReq as Request, mockRes as Response)

      expect(auditService.getAuditLogs).toHaveBeenCalledWith({
        userId: 1,
        action: 'USER_LOGIN',
        entityType: 'User',
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 50,
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          logs: mockLogs,
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      })
    })

    it('should use defaults when query params are missing', async () => {
      ;(auditService.getAuditLogs as jest.Mock).mockResolvedValue({
        logs: [],
        total: 0,
      })

      await getAuditLogs(mockReq as Request, mockRes as Response)

      expect(auditService.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        action: undefined,
        entityType: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 50,
      })
    })

    it('should propagate service errors', async () => {
      const error = new Error('Database error')
      ;(auditService.getAuditLogs as jest.Mock).mockRejectedValue(error)

      await expect(
        getAuditLogs(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Database error')
    })
  })
})
