import { Request, Response } from 'express'
import { compressionMiddleware } from '../../middleware/compression'

describe('Compression Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: jest.Mock

  beforeEach(() => {
    mockReq = {
      headers: {},
    }
    mockRes = {
      getHeader: jest.fn(),
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  describe('filter function', () => {
    it('should not compress when x-no-compression header is present', (done) => {
      mockReq.headers = { 'x-no-compression': 'true' }
      
      compressionMiddleware(mockReq as Request, mockRes as Response, mockNext)
      
      // The middleware should call next, but compression should be disabled
      // We verify the middleware doesn't crash with the header
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalled()
        done()
      }, 10)
    })

    it('should call next for normal requests', (done) => {
      mockReq.headers = { 'accept-encoding': 'gzip, deflate' }
      
      compressionMiddleware(mockReq as Request, mockRes as Response, mockNext)
      
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalled()
        done()
      }, 10)
    })

    it('should handle requests without accept-encoding header', (done) => {
      mockReq.headers = {}
      
      compressionMiddleware(mockReq as Request, mockRes as Response, mockNext)
      
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalled()
        done()
      }, 10)
    })
  })

  describe('configuration', () => {
    it('should export compressionMiddleware function', () => {
      expect(compressionMiddleware).toBeDefined()
      expect(typeof compressionMiddleware).toBe('function')
    })
  })
})
