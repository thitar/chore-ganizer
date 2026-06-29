import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/prisma'

const BASE = '/api/points'

let parentCookies: string[] = []
let childCookies: string[] = []
let aliceId: number | null = null
let bobId: number | null = null

beforeAll(async () => {
  const parentRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'dad@home.local', password: 'password123' })
  const pc = parentRes.headers['set-cookie']
  parentCookies = Array.isArray(pc) ? pc : pc ? [pc] : []

  const childRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@home.local', password: 'password123' })
  const cc = childRes.headers['set-cookie']
  childCookies = Array.isArray(cc) ? cc : cc ? [cc] : []

  const alice = await prisma.user.findUnique({ where: { email: 'alice@home.local' } })
  const bob = await prisma.user.findUnique({ where: { email: 'bob@home.local' } })
  if (alice) aliceId = alice.id
  if (bob) bobId = bob.id
})

describe('GET /api/points/me', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(`${BASE}/me`)
    expect(res.status).toBe(401)
  })

  it('returns own points for authenticated user', async () => {
    const res = await request(app).get(`${BASE}/me`).set('Cookie', childCookies)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('user')
    expect(res.body.data).toHaveProperty('balance')
    expect(res.body.data).toHaveProperty('logs')
    expect(Array.isArray(res.body.data.logs)).toBe(true)
  })
})

describe('GET /api/points/users/:id', () => {
  it('parent can view any user points', async () => {
    if (!bobId) throw new Error('bob not seeded')
    const res = await request(app).get(`${BASE}/users/${bobId}`).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe(bobId)
  })

  it('child can view own points', async () => {
    if (!aliceId) throw new Error('alice not seeded')
    const res = await request(app).get(`${BASE}/users/${aliceId}`).set('Cookie', childCookies)
    expect(res.status).toBe(200)
  })

  it('child cannot view another user (403)', async () => {
    if (!bobId) throw new Error('bob not seeded')
    const res = await request(app).get(`${BASE}/users/${bobId}`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/points/adjust', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post(`${BASE}/adjust`).send({ userId: 3, amount: 5, reason: 'Test' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    if (!aliceId) throw new Error('alice not seeded')
    const res = await request(app)
      .post(`${BASE}/adjust`)
      .set('Cookie', childCookies)
      .send({ userId: aliceId, amount: 5, reason: 'Test' })
    expect(res.status).toBe(403)
  })

  it('parent can create adjustment', async () => {
    if (!aliceId) throw new Error('alice not seeded')
    const res = await request(app)
      .post(`${BASE}/adjust`)
      .set('Cookie', parentCookies)
      .send({ userId: aliceId, amount: 5, reason: 'Test adjustment' })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('ADJUSTMENT')
    expect(res.body.data.amount).toBe(5)
    expect(res.body.data.reason).toBe('Test adjustment')
  })

  it('returns 400 for zero amount', async () => {
    if (!aliceId) throw new Error('alice not seeded')
    const res = await request(app)
      .post(`${BASE}/adjust`)
      .set('Cookie', parentCookies)
      .send({ userId: aliceId, amount: 0, reason: 'Test' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty reason', async () => {
    if (!aliceId) throw new Error('alice not seeded')
    const res = await request(app)
      .post(`${BASE}/adjust`)
      .set('Cookie', parentCookies)
      .send({ userId: aliceId, amount: 5, reason: '' })
    expect(res.status).toBe(400)
  })
})
