import { Request, Response, NextFunction } from 'express'
import { authenticate, authorize } from '../../middleware/auth'
import prisma from '../../config/database'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      session: {
        destroy: jest.fn((cb) => cb()),
      } as any,
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  describe('authenticate', () => {
    it('should return 401 if no session exists', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unauthorized - No session found',
          code: 'UNAUTHORIZED',
        },
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 if user not found', async () => {
      mockReq.session = {
        userId: 999,
        destroy: jest.fn((cb) => cb()),
      } as any
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unauthorized - User not found',
          code: 'UNAUTHORIZED',
        },
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should attach user to request and call next', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        points: 100,
      }
      mockReq.session = {
        userId: 1,
        destroy: jest.fn((cb) => cb()),
      } as any
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        points: 100,
      })
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('authorize', () => {
    it('should return 401 if no user in request', () => {
      const middleware = authorize('PARENT')
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unauthorized - No user found',
          code: 'UNAUTHORIZED',
        },
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 if user role not allowed', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'CHILD',
        points: 100,
      }
      const middleware = authorize('PARENT')
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Forbidden - Insufficient permissions',
          code: 'FORBIDDEN',
        },
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should call next if user role is allowed', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        points: 100,
      }
      const middleware = authorize('PARENT')
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow multiple roles', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'CHILD',
        points: 100,
      }
      const middleware = authorize('PARENT', 'CHILD')
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })
})
