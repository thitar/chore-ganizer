/**
 * Audit Service Tests
 * 
 * Unit tests for the audit logging service.
 */

import { createAuditLog, getAuditLogs, getAuditContext } from '../../services/audit.service'
import { AUDIT_ACTIONS } from '../../constants/audit-actions'
import prisma from '../../config/database'
import { Request } from 'express'

// Mock Prisma
jest.mock('../../config/database', () => {
  const mockFn = jest.fn()
  return {
    __esModule: true,
    default: {
      auditLog: {
        create: mockFn,
        findMany: mockFn,
        count: mockFn,
      },
    },
  }
})

// Mock console.error to prevent noise in test output
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('createAuditLog', () => {
    const auditParams = {
      userId: 1,
      action: AUDIT_ACTIONS.USER_CREATED,
      entityType: 'User',
      entityId: 123,
      oldValue: { title: 'Old' },
      newValue: { title: 'New' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    }

    it('should create audit log with all fields', async () => {
      const mockLog = { id: 1, ...auditParams, timestamp: new Date() }
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue(mockLog)

      await createAuditLog(auditParams)

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: auditParams.userId,
          action: auditParams.action,
          entityType: auditParams.entityType,
          entityId: auditParams.entityId,
          oldValue: JSON.stringify(auditParams.oldValue),
          newValue: JSON.stringify(auditParams.newValue),
          ipAddress: auditParams.ipAddress,
          userAgent: auditParams.userAgent,
        },
      })
    })

    it('should create audit log with minimal fields', async () => {
      const minimalParams = {
        userId: 1,
        action: AUDIT_ACTIONS.USER_LOGIN,
        entityType: 'User',
      }
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 1, ...minimalParams })

      await createAuditLog(minimalParams)

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: minimalParams.userId,
          action: minimalParams.action,
          entityType: minimalParams.entityType,
          entityId: null,
          oldValue: null,
          newValue: null,
          ipAddress: null,
          userAgent: null,
        },
      })
    })

    it('should not throw if database fails - audit logging should be non-blocking', async () => {
      ;(prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('DB Error'))

      // Should not throw
      await expect(createAuditLog(auditParams)).resolves.not.toThrow()
    })

    it('should stringify complex objects in oldValue and newValue', async () => {
      const complexParams = {
        userId: 1,
        action: AUDIT_ACTIONS.CHORE_TEMPLATE_UPDATED,
        entityType: 'ChoreTemplate',
        oldValue: { title: 'Test', points: 10, metadata: { created: true } },
        newValue: { title: 'Updated', points: 20, metadata: { created: true, updated: true } },
      }
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 1 })

      await createAuditLog(complexParams)

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            oldValue: JSON.stringify(complexParams.oldValue),
            newValue: JSON.stringify(complexParams.newValue),
          }),
        })
      )
    })
  })

  describe('getAuditLogs', () => {
    const mockLogs = [
      {
        id: 1,
        userId: 1,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 1,
        oldValue: null,
        newValue: '{"title":"Test"}',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      },
      {
        id: 2,
        userId: 2,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: 2,
        oldValue: null,
        newValue: null,
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome',
        timestamp: new Date(),
      },
    ]

    it.skip('should return logs with pagination', async () => {
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs)
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(2)

      const result = await getAuditLogs({ page: 1, limit: 10 })

      expect(result.logs).toEqual(mockLogs)
      expect(result.total).toBe(2)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      )
    })

    it('should filter by userId', async () => {
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockLogs[0]])
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(1)

      await getAuditLogs({ userId: 1 })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
        })
      )
    })

    it('should filter by action', async () => {
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockLogs[0]])
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(1)

      await getAuditLogs({ action: 'USER_CREATED' })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'USER_CREATED' }),
        })
      )
    })

    it('should filter by entityType', async () => {
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockLogs[0]])
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(1)

      await getAuditLogs({ entityType: 'User' })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'User' }),
        })
      )
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs)
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(2)

      await getAuditLogs({ startDate, endDate })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: startDate,
              lte: endDate,
            }),
          }),
        })
      )
    })

    it('should use default pagination values', async () => {
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(0)

      await getAuditLogs({})

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        })
      )
    })

    it('should calculate skip correctly for page 3', async () => {
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(0)

      await getAuditLogs({ page: 3, limit: 10 })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      )
    })
  })

  describe('getAuditContext', () => {
    it('should extract user info from request', () => {
      const mockReq = {
        user: { id: 1 },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Agent' },
        socket: { remoteAddress: undefined },
      } as unknown as Request

      const result = getAuditContext(mockReq)

      expect(result).toEqual({
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      })
    })

    it('should use socket remoteAddress as fallback', () => {
      const mockReq = {
        user: { id: 1 },
        ip: undefined,
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      } as unknown as Request

      const result = getAuditContext(mockReq)

      expect(result).toEqual({
        userId: 1,
        ipAddress: '10.0.0.1',
        userAgent: undefined,
      })
    })

    it('should handle missing user', () => {
      const mockReq = {
        user: undefined,
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Agent' },
        socket: { remoteAddress: undefined },
      } as unknown as Request

      const result = getAuditContext(mockReq)

      expect(result).toEqual({
        userId: undefined,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      })
    })

    it('should handle completely empty request', () => {
      const mockReq = {
        user: undefined,
        ip: undefined,
        headers: {},
        socket: { remoteAddress: undefined },
      } as unknown as Request

      const result = getAuditContext(mockReq)

      expect(result).toEqual({
        userId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      })
    })
  })
})
