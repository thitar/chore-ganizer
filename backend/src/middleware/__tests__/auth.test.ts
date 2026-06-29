import { Request, Response, NextFunction } from 'express'
import { authenticate, authorize } from '../auth'

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

const { prisma } = require('../../config/prisma')

function mockReqResNext(sessionData?: { userId?: number; role?: string }) {
  const req = {
    session: {
      ...sessionData,
      destroy: jest.fn().mockImplementation((cb) => cb()),
    },
  } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('authenticate middleware', () => {
  it('calls next() when session.userId exists and user is in DB', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 })
    const { req, res, next } = mockReqResNext({ userId: 1 })
    await authenticate(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when session.userId is missing', async () => {
    const { req, res, next } = mockReqResNext()
    await authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Authentication required' },
      data: null,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when session.userId refers to a deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    const { req, res, next } = mockReqResNext({ userId: 1 })
    await authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.clearCookie).toHaveBeenCalledWith('connect.sid')
    expect(next).not.toHaveBeenCalled()
  })
})

describe('authorize middleware', () => {
  it('calls next() for allowed role', () => {
    const { req, res, next } = mockReqResNext({ userId: 1, role: 'PARENT' })
    const middleware = authorize('PARENT')
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 for disallowed role', () => {
    const { req, res, next } = mockReqResNext({ userId: 1, role: 'CHILD' })
    const middleware = authorize('PARENT')
    middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Forbidden' },
      data: null,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() for PARENT with authorize("PARENT", "CHILD")', () => {
    const { req, res, next } = mockReqResNext({ userId: 1, role: 'PARENT' })
    const middleware = authorize('PARENT', 'CHILD')
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('calls next() for CHILD with authorize("PARENT", "CHILD")', () => {
    const { req, res, next } = mockReqResNext({ userId: 1, role: 'CHILD' })
    const middleware = authorize('PARENT', 'CHILD')
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 when session has no role', () => {
    const { req, res, next } = mockReqResNext({ userId: 1 })
    const middleware = authorize('PARENT')
    middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
