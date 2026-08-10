jest.mock('../prisma', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const { prisma } = require('../prisma')

let PrismaSessionStore: typeof import('../sessionStore').PrismaSessionStore

beforeEach(() => {
  prisma.session.findUnique.mockReset().mockResolvedValue(null)
  prisma.session.upsert.mockReset().mockResolvedValue({ id: 'x' })
  prisma.session.updateMany.mockReset().mockResolvedValue({ count: 1 })
  prisma.session.deleteMany.mockReset().mockResolvedValue({ count: 1 })
  prisma.session.findMany.mockReset().mockResolvedValue([])
  prisma.session.count.mockReset().mockResolvedValue(0)
  delete require.cache[require.resolve('../sessionStore')]
  PrismaSessionStore = require('../sessionStore').PrismaSessionStore
})

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    sid: 'abc',
    data: JSON.stringify({ cookie: { originalMaxAge: 2592000000 }, userId: 1, role: 'PARENT' }),
    expires: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('PrismaSessionStore.get', () => {
  it('returns the deserialized session for an existing unexpired row', async () => {
    prisma.session.findUnique.mockResolvedValue(row())
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('abc', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toEqual(expect.objectContaining({ userId: 1, role: 'PARENT' }))
        resolve()
      })
    })
    expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { sid: 'abc' } })
  })

  it('returns null for a missing row', async () => {
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('missing', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toBeNull()
        resolve()
      })
    })
  })

  it('returns null for an expired row without deleting it (hourly prune handles cleanup)', async () => {
    prisma.session.findUnique.mockResolvedValue(row({ expires: new Date(Date.now() - 1000) }))
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('abc', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toBeNull()
        resolve()
      })
    })
    expect(prisma.session.deleteMany).not.toHaveBeenCalled()
  })

  it('treats a corrupted row as absent and removes it', async () => {
    prisma.session.findUnique.mockResolvedValue(row({ data: 'not-json{{{' }))
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('abc', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toBeNull()
        resolve()
      })
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { sid: 'abc', expires: expect.any(Date) },
    })
  })

  it('propagates a lookup error to the callback', async () => {
    const lookupErr = new Error('lookup failed')
    prisma.session.findUnique.mockRejectedValue(lookupErr)
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('abc', (err) => {
        try {
          expect(err).toBe(lookupErr)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  })
})

describe('PrismaSessionStore.set', () => {
  it('upserts the serialized session with the cookie expiry', async () => {
    const sessionData = {
      cookie: { originalMaxAge: 2592000000, expires: new Date(Date.now() + 60_000) },
      userId: 1,
      role: 'PARENT',
    }
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.set('abc', sessionData, (err) => (err ? reject(err) : resolve()))
    })
    expect(prisma.session.upsert).toHaveBeenCalledWith({
      where: { sid: 'abc' },
      create: { sid: 'abc', data: JSON.stringify(sessionData), expires: sessionData.cookie.expires },
      update: { data: JSON.stringify(sessionData), expires: sessionData.cookie.expires },
    })
  })

  it('uses the default 30-day expiry when the session cookie has none', async () => {
    const sessionData = { cookie: { originalMaxAge: null }, userId: 1 }
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.set('abc', sessionData, (err) => (err ? reject(err) : resolve()))
    })
    const call = prisma.session.upsert.mock.calls[0][0]
    const target = Date.now() + 30 * 24 * 60 * 60 * 1000
    expect(call.create.expires.getTime()).toBeGreaterThanOrEqual(target - 1000)
    expect(call.create.expires.getTime()).toBeLessThanOrEqual(target + 1000)
  })
})

describe('PrismaSessionStore.destroy', () => {
  it('deletes the session row by sid', async () => {
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.destroy('abc', (err) => (err ? reject(err) : resolve()))
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { sid: 'abc' } })
  })
})

describe('PrismaSessionStore.touch', () => {
  it('updates only the expires column (no re-serialization)', async () => {
    const sessionData = {
      cookie: { originalMaxAge: 2592000000, expires: new Date(Date.now() + 60_000) },
      userId: 1,
    }
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve) => {
      store.touch('abc', sessionData, resolve)
    })
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { sid: 'abc' },
      data: { expires: sessionData.cookie.expires },
    })
    expect(prisma.session.upsert).not.toHaveBeenCalled()
  })

  it('propagates a DB write error to the callback', async () => {
    const writeErr = new Error('update failed')
    prisma.session.updateMany.mockRejectedValue(writeErr)
    const store = new PrismaSessionStore()
    const sessionData = {
      cookie: { originalMaxAge: 2592000000, expires: new Date(Date.now() + 60_000) },
      userId: 1,
    }
    await new Promise<void>((resolve, reject) => {
      store.touch('abc', sessionData, (err) => {
        try {
          expect(err).toBe(writeErr)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  })
})

describe('PrismaSessionStore.all / length / clear', () => {
  it('all returns only unexpired sessions keyed by sid', async () => {
    const live = row({ sid: 'live' })
    prisma.session.findMany.mockResolvedValue([live, row({ sid: 'stale', expires: new Date(Date.now() - 1000) })])
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.all((err, sessions) => {
        if (err) return reject(err)
        expect(Object.keys(sessions as Record<string, unknown>)).toEqual(['live'])
        resolve()
      })
    })
  })

  it('all skips corrupted rows instead of failing the listing', async () => {
    prisma.session.findMany.mockResolvedValue([
      row({ sid: 'good' }),
      row({ sid: 'bad', data: 'not-json' }),
    ])
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.all((err, sessions) => {
        if (err) return reject(err)
        expect(Object.keys(sessions as Record<string, unknown>)).toEqual(['good'])
        resolve()
      })
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { sid: 'bad', expires: expect.any(Date) },
    })
  })

  it('length returns the row count', async () => {
    prisma.session.count.mockResolvedValue(3)
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.length((err, count) => {
        if (err) return reject(err)
        expect(count).toBe(3)
        resolve()
      })
    })
  })

  it('clear deletes all rows', async () => {
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.clear((err) => (err ? reject(err) : resolve()))
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({})
  })
})

describe('PrismaSessionStore.pruneExpired', () => {
  it('deletes rows whose expires is in the past', async () => {
    const store = new PrismaSessionStore()
    await store.pruneExpired()
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { expires: { lt: expect.any(Date) } },
    })
  })
})
