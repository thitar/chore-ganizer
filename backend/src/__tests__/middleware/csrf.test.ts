import { Request, Response, NextFunction } from 'express'
import { csrfProtection } from '../../middleware/csrf'

// csrfProtection short-circuits entirely when NODE_ENV === 'test' (jest's
// default), which is exactly what let the token wiring bug ship undetected.
// These tests force NODE_ENV to a non-test value so the real validation
// logic — the actual security control — runs and gets exercised.
describe('csrfProtection (validation logic, NODE_ENV forced non-test)', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  function makeReq(overrides: Partial<Request> = {}): Request {
    return {
      method: 'POST',
      cookies: {},
      headers: {},
      ...overrides,
    } as Request
  }

  function makeRes(): Response & { statusCode?: number; body?: unknown } {
    const res: Partial<Response> & { statusCode?: number; body?: unknown } = {}
    res.cookie = jest.fn().mockReturnValue(res)
    res.status = jest.fn().mockImplementation((code: number) => {
      res.statusCode = code
      return res
    }) as unknown as Response['status']
    res.json = jest.fn().mockImplementation((body: unknown) => {
      res.body = body
      return res
    }) as unknown as Response['json']
    return res as Response & { statusCode?: number; body?: unknown }
  }

  it('rejects a mutating request with no CSRF header', () => {
    const req = makeReq({ cookies: { 'XSRF-TOKEN': 'abc123' } })
    const res = makeRes()
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toEqual({
      success: false,
      error: { message: 'Invalid CSRF token' },
      data: null,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a mutating request where the header does not match the cookie', () => {
    const req = makeReq({
      cookies: { 'XSRF-TOKEN': 'abc123' },
      headers: { 'x-xsrf-token': 'wrong-token' },
    })
    const res = makeRes()
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('allows a mutating request where the header matches the cookie', () => {
    const req = makeReq({
      cookies: { 'XSRF-TOKEN': 'abc123' },
      headers: { 'x-xsrf-token': 'abc123' },
    })
    const res = makeRes()
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('sets a CSRF cookie when none exists yet, without blocking the request', () => {
    const req = makeReq({ method: 'GET', cookies: {} })
    const res = makeRes()
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ sameSite: 'strict', path: '/' })
    )
    expect(next).toHaveBeenCalled()
  })

  it('does not reissue the cookie when one is already present', () => {
    const req = makeReq({ method: 'GET', cookies: { 'XSRF-TOKEN': 'existing-token' } })
    const res = makeRes()
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(res.cookie).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('skips validation for GET requests even without a header', () => {
    const req = makeReq({ method: 'GET', cookies: { 'XSRF-TOKEN': 'abc123' } })
    const res = makeRes()
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('csrfProtection (bypassed under NODE_ENV=test)', () => {
  it('calls next() immediately without checking cookies or headers', () => {
    const req = { method: 'POST', cookies: {}, headers: {} } as Request
    const res = {} as Response
    const next: NextFunction = jest.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
