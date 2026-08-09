import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/prisma'

describe('persistent session storage', () => {
  let dadId: number | null = null

  beforeAll(async () => {
    await prisma.session.deleteMany({})
    const dad = await prisma.user.findUnique({ where: { email: 'dad@home.local' } })
    dadId = dad ? dad.id : null
  })

  it('stores the session in the DB and replays it across a simulated backend restart', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dad@home.local', password: 'password123' })
    expect(loginRes.status).toBe(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    expect(cookies.length).toBeGreaterThan(0)

    const row = await prisma.session.findFirst({
      where: { data: { contains: `"userId":${dadId}` } },
    })
    expect(row).not.toBeNull()
    expect(row!.expires.getTime()).toBeGreaterThan(Date.now())

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
