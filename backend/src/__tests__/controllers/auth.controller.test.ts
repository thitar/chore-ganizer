import { createMockRequest, createMockResponse, mockUsers } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/auth.service', () => ({
  register: jest.fn(),
  login: jest.fn(),
}))

jest.mock('../../services/audit.service', () => ({
  logLogin: jest.fn(),
  logLogout: jest.fn(),
  getAuditContext: jest.fn(),
  createAuditLog: jest.fn(),
}))

jest.mock('../../services/users.service', () => ({
  getUserById: jest.fn(),
}))

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('../../utils/lockout', () => ({
  isLocked: jest.fn(),
  unlockAccount: jest.fn(),
}))

import * as authService from '../../services/auth.service'
import * as auditService from '../../services/audit.service'
import * as usersService from '../../services/users.service'
import prisma from '../../config/database'
import * as lockout from '../../utils/lockout'
import { register, login, logout, getCurrentUser, unlock, getLockoutStatus } from '../../controllers/auth.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Auth Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('register', () => {
    it('should return 201 with user data on success', async () => {
      const mockResult = {
        user: { id: 2, email: 'child@test.com', name: 'Test Child', role: 'CHILD' },
      }
      ;(authService.register as jest.Mock).mockResolvedValue(mockResult)

      mockReq = createMockRequest({
        body: { email: 'child@test.com', password: 'password123', name: 'Test Child' },
      })

      await register(mockReq as Request, mockRes as Response)

      expect(authService.register).toHaveBeenCalledWith({
        email: 'child@test.com',
        password: 'password123',
        name: 'Test Child',
        role: 'CHILD',
      })
      expect(mockReq.session?.userId).toBe(mockResult.user.id)
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      })
    })

    it('should throw 400 if email, password, or name are missing', async () => {
      mockReq = createMockRequest({
        body: { email: 'test@test.com' },
      })

      await expect(
        register(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(authService.register as jest.Mock).mockRejectedValue(new Error('Registration error'))

      mockReq = createMockRequest({
        body: { email: 'child@test.com', password: 'password123', name: 'Test Child' },
      })

      await expect(
        register(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Registration error')
    })
  })

  describe('login', () => {
    it('should return 200 with user data on success', async () => {
      const mockResult = {
        user: { id: 1, email: 'parent@test.com', name: 'Test Parent', role: 'PARENT' },
      }
      ;(authService.login as jest.Mock).mockResolvedValue(mockResult)

      mockReq = createMockRequest({
        body: { email: 'parent@test.com', password: 'password123' },
        session: { userId: undefined, destroy: jest.fn() } as any,
      })

      await login(mockReq as Request, mockRes as Response)

      expect(authService.login).toHaveBeenCalledWith({
        email: 'parent@test.com',
        password: 'password123',
      })
      expect(mockReq.session?.userId).toBe(mockResult.user.id)
      expect(auditService.logLogin).toHaveBeenCalledWith(mockReq, mockResult.user.id, true)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      })
    })

    it('should throw 400 if email or password are missing', async () => {
      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should catch 401 errors and log failed login', async () => {
      const authError = new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
      ;(authService.login as jest.Mock).mockRejectedValue(authError)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUsers.parent)

      mockReq = createMockRequest({
        body: { email: 'parent@test.com', password: 'wrong' },
        session: { userId: undefined, destroy: jest.fn() } as any,
      })

      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(authError)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'parent@test.com' },
      })
      expect(auditService.logLogin).toHaveBeenCalledWith(mockReq, mockUsers.parent.id, false)
    })

    it('should silently ignore audit lookup errors during failed login', async () => {
      const authError = new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
      ;(authService.login as jest.Mock).mockRejectedValue(authError)
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'))

      mockReq = createMockRequest({
        body: { email: 'parent@test.com', password: 'wrong' },
      })

      // Should still re-throw the original error, not the audit error
      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(authError)
    })

    it('should re-throw non-401 errors without audit logging', async () => {
      const serverError = new Error('Server error')
      ;(authService.login as jest.Mock).mockRejectedValue(serverError)

      mockReq = createMockRequest({
        body: { email: 'parent@test.com', password: 'password123' },
      })

      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Server error')

      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('should return 200 with success message on logout', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        session: {
          destroy: jest.fn((cb: (err?: any) => void) => cb(undefined)),
        } as any,
      })

      await logout(mockReq as Request, mockRes as Response)

      expect(mockReq.session?.destroy).toHaveBeenCalled()
      expect(auditService.logLogout).toHaveBeenCalledWith(mockReq, 1)
      expect(mockRes.clearCookie).toHaveBeenCalledWith('connect.sid')
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Logged out successfully' },
      })
    })

    it('should throw 500 if session destroy fails', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        session: {
          destroy: jest.fn((cb: (err?: any) => void) => cb(new Error('Destroy failed'))),
        } as any,
      })

      await expect(
        logout(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should handle logout without user (incomplete session)', async () => {
      mockReq = createMockRequest({
        user: undefined,
        session: {
          destroy: jest.fn((cb: (err?: any) => void) => cb(undefined)),
        } as any,
      })

      await logout(mockReq as Request, mockRes as Response)

      expect(auditService.logLogout).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Logged out successfully' },
      })
    })
  })

  describe('getCurrentUser', () => {
    it('should return 200 with user data on success', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.parent)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await getCurrentUser(mockReq as Request, mockRes as Response)

      expect(usersService.getUserById).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUsers.parent },
      })
    })

    it('should throw 401 if user not authenticated', async () => {
      await expect(
        getCurrentUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.getUserById as jest.Mock).mockRejectedValue(new Error('User error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
      })

      await expect(
        getCurrentUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('User error')
    })
  })

  describe('unlock', () => {
    beforeEach(() => {
      ;(auditService.getAuditContext as jest.Mock).mockReturnValue({
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })
      ;(auditService.createAuditLog as jest.Mock).mockResolvedValue(undefined)
    })

    it('should unlock account and return 200 on success', async () => {
      ;(lockout.isLocked as jest.Mock).mockResolvedValue({
        isLocked: true,
        lockedAt: new Date(),
        lockoutUntil: new Date(),
        failedLoginAttempts: 5,
        remainingLockoutSeconds: 300,
      })
      ;(lockout.unlockAccount as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { userId: '3' },
      })

      await unlock(mockReq as Request, mockRes as Response)

      expect(lockout.isLocked).toHaveBeenCalledWith(3)
      expect(lockout.unlockAccount).toHaveBeenCalledWith(3)
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Account unlocked successfully',
          userId: 3,
        },
      })
    })

    it('should return success message if account is not locked', async () => {
      ;(lockout.isLocked as jest.Mock).mockResolvedValue({
        isLocked: false,
        lockedAt: null,
        lockoutUntil: null,
        failedLoginAttempts: 0,
        remainingLockoutSeconds: null,
      })

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { userId: '1' },
      })

      await unlock(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Account is not locked',
          userId: 1,
        },
      })
      expect(lockout.unlockAccount).not.toHaveBeenCalled()
    })

    it('should throw 400 if userId param is missing', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: {},
      })

      await expect(
        unlock(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 401 if user not authenticated', async () => {
      mockReq = createMockRequest({
        params: { userId: '3' },
      })

      await expect(
        unlock(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 403 if user is not PARENT', async () => {
      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        params: { userId: '3' },
      })

      await expect(
        unlock(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })
  })

  describe('getLockoutStatus', () => {
    it('should return 200 with lockout status on success', async () => {
      const mockStatus = {
        isLocked: true,
        lockedAt: new Date(),
        lockoutUntil: new Date(),
        failedLoginAttempts: 5,
        remainingLockoutSeconds: 300,
      }
      ;(lockout.isLocked as jest.Mock).mockResolvedValue(mockStatus)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { userId: '3' },
      })

      await getLockoutStatus(mockReq as Request, mockRes as Response)

      expect(lockout.isLocked).toHaveBeenCalledWith(3)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
      })
    })

    it('should throw 400 if userId param is missing', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: {},
      })

      await expect(
        getLockoutStatus(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 401 if user not authenticated', async () => {
      mockReq = createMockRequest({
        params: { userId: '3' },
      })

      await expect(
        getLockoutStatus(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 403 if user is not PARENT', async () => {
      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        params: { userId: '3' },
      })

      await expect(
        getLockoutStatus(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })
  })
})
