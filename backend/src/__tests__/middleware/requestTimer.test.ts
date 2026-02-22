import { Request, Response } from 'express'
import { requestTimerMiddleware, getRequestDuration } from '../../middleware/requestTimer'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('Request Timer Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: jest.Mock

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      headers: {},
    }
    mockRes = {
      on: jest.fn(),
      setHeader: jest.fn(),
      statusCode: 200,
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  it('should call next middleware', () => {
    requestTimerMiddleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should set startTime on request', () => {
    requestTimerMiddleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockReq.startTime).toBeDefined()
    expect(typeof mockReq.startTime).toBe('number')
  })

  it('should register finish event listener', () => {
    requestTimerMiddleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function))
  })

  it('should set X-Response-Time header on finish', () => {
    requestTimerMiddleware(mockReq as Request, mockRes as Response, mockNext)
    
    // Simulate finish event
    const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'finish'
    )?.[1]
    if (finishCallback) finishCallback()
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.any(String))
  })

  it('should log info for fast requests', () => {
    const { logger } = require('../../utils/logger')
    
    requestTimerMiddleware(mockReq as Request, mockRes as Response, mockNext)
    
    // Simulate finish event immediately (fast request)
    const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'finish'
    )?.[1]
    if (finishCallback) finishCallback()
    
    expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
      method: 'GET',
      url: '/api/test',
      statusCode: 200,
    }))
  })

  it('should return 0 for getRequestDuration without startTime', () => {
    mockReq.startTime = undefined
    expect(getRequestDuration(mockReq as Request)).toBe(0)
  })

  it('should return positive duration for getRequestDuration with startTime', () => {
    mockReq.startTime = Date.now() - 100 // 100ms ago
    const duration = getRequestDuration(mockReq as Request)
    expect(duration).toBeGreaterThanOrEqual(100)
  })

  it('should include request metadata in log', () => {
    const { logger } = require('../../utils/logger')
    
    mockReq.method = 'POST'
    mockReq.originalUrl = '/api/users'
    mockReq.headers = { 'user-agent': 'test-agent' }
    
    requestTimerMiddleware(mockReq as Request, mockRes as Response, mockNext)
    
    const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'finish'
    )?.[1]
    if (finishCallback) finishCallback()
    
    expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
      method: 'POST',
      url: '/api/users',
    }))
  })
})
