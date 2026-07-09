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
