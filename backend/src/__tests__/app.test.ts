describe('app startup — SESSION_SECRET guard', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalSecret = process.env.SESSION_SECRET

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.env.SESSION_SECRET = originalSecret
    jest.resetModules()
  })

  it('throws on startup when NODE_ENV=production and SESSION_SECRET is unset', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.SESSION_SECRET
    jest.isolateModules(() => {
      expect(() => require('../app')).toThrow(/SESSION_SECRET must be set/)
    })
  })

  it('does not throw when NODE_ENV=production and SESSION_SECRET is set', () => {
    process.env.NODE_ENV = 'production'
    process.env.SESSION_SECRET = 'a-real-production-secret'
    jest.isolateModules(() => {
      expect(() => require('../app')).not.toThrow()
    })
  })

  it('does not throw when SESSION_SECRET is unset outside production', () => {
    process.env.NODE_ENV = 'test'
    delete process.env.SESSION_SECRET
    jest.isolateModules(() => {
      expect(() => require('../app')).not.toThrow()
    })
  })
})

describe('app startup — SAMESITE_POLICY guard', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalSecret = process.env.SESSION_SECRET
  const originalSameSitePolicy = process.env.SAMESITE_POLICY
  const originalSecureCookies = process.env.SECURE_COOKIES

  afterEach(() => {
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }

    restore('NODE_ENV', originalNodeEnv)
    restore('SESSION_SECRET', originalSecret)
    restore('SAMESITE_POLICY', originalSameSitePolicy)
    restore('SECURE_COOKIES', originalSecureCookies)
    jest.resetModules()
  })

  it('throws on startup when SameSite=None is configured without secure cookies', () => {
    process.env.NODE_ENV = 'production'
    process.env.SESSION_SECRET = 'a-real-production-secret'
    process.env.SAMESITE_POLICY = 'none'
    process.env.SECURE_COOKIES = 'false'

    jest.isolateModules(() => {
      expect(() => require('../app')).toThrow(/SAMESITE_POLICY=none requires SECURE_COOKIES=true/)
    })
  })

  it('does not throw when SameSite=None is configured with secure cookies', () => {
    process.env.NODE_ENV = 'production'
    process.env.SESSION_SECRET = 'a-real-production-secret'
    process.env.SAMESITE_POLICY = 'none'
    process.env.SECURE_COOKIES = 'true'

    jest.isolateModules(() => {
      expect(() => require('../app')).not.toThrow()
    })
  })
})
