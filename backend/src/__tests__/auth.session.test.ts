import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/prisma'

// Extract the unsigned session id from a signed `connect.sid` cookie value
// (`s:<sid>.<signature>`). Scope cleanup to the exact rows this suite creates:
// the real-DB integration suites all share one `dev.db` across parallel jest
// workers, so a blanket `deleteMany({})` here would wipe other suites' live
// sessions mid-run and make their replayed cookies 401.
function extractSid(setCookieHeader: string[]): string | null {
  const raw = setCookieHeader.find((c) => c.startsWith('connect.sid='))
  if (!raw) return null
  const value = decodeURIComponent(raw.split(';')[0].slice('connect.sid='.length))
  return value.startsWith('s:') ? value.slice(2).split('.')[0] : value.split('.')[0]
}

describe('persistent session storage', () => {
  let dadId: number | null = null
  const createdSids: string[] = []

  beforeAll(async () => {
    const dad = await prisma.user.findUnique({ where: { email: 'dad@home.local' } })
    dadId = dad ? dad.id : null
  })

  afterAll(async () => {
    if (createdSids.length > 0) {
      await prisma.session.deleteMany({ where: { sid: { in: createdSids } } })
    }
  })

  it('stores the session in the DB and replays it across a simulated backend restart', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dad@home.local', password: 'password123' })
    expect(loginRes.status).toBe(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    expect(cookies.length).toBeGreaterThan(0)

    const sid = extractSid(cookies)
    expect(sid).toBeTruthy()
    if (sid) createdSids.push(sid)

    const row = await prisma.session.findUnique({ where: { sid } })
    expect(row).not.toBeNull()
    expect(row!.expires.getTime()).toBeGreaterThan(Date.now())
    expect(JSON.parse(row!.data)).toMatchObject({ userId: dadId })

    // Simulate a backend restart: evict the app module from the require cache so
    // re-requiring builds a fresh app + fresh PrismaSessionStore over the same DB.
    const appPath = require.resolve('../app')
    delete require.cache[appPath]
    const { app: freshApp } = require('../app')

    const meRes = await request(freshApp)
      .get('/api/auth/me')
      .set('Cookie', cookies)
    expect(meRes.status).toBe(200)
    expect(meRes.body.data.email).toBe('dad@home.local')
  })
})
