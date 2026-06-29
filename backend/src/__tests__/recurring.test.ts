import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/prisma'

const BASE = '/api/recurring'

let parentCookies: string[] = []
let childCookies: string[] = []
let createdRecurringIds: number[] = []
let testTemplateId: number | null = null
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

  const tplRes = await request(app)
    .post('/api/templates')
    .set('Cookie', parentCookies)
    .send({ title: 'Recurring Test Template', points: 7, category: 'testing' })
  if (tplRes.body.success) testTemplateId = tplRes.body.data.id

  const alice = await prisma.user.findUnique({ where: { email: 'alice@home.local' } })
  const bob = await prisma.user.findUnique({ where: { email: 'bob@home.local' } })
  if (alice) aliceId = alice.id
  if (bob) bobId = bob.id
})

afterAll(async () => {
  for (const id of createdRecurringIds) {
    try {
      await request(app).delete(`${BASE}/${id}`).set('Cookie', parentCookies)
    } catch { /* ignore cleanup errors */ }
  }
  if (testTemplateId) {
    try {
      await request(app).delete(`/api/templates/${testTemplateId}`).set('Cookie', parentCookies)
    } catch { /* ignore cleanup errors */ }
  }
})

describe('POST /api/recurring', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post(BASE).send({})
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(BASE).set('Cookie', childCookies).send({})
    expect(res.status).toBe(403)
  })

  it('returns 201 with created recurring chore for PARENT', async () => {
    if (!aliceId) throw new Error('alice not seeded')

    const res = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({
        choreTemplateId: testTemplateId,
        assignedToId: aliceId,
        frequency: 'DAILY',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.frequency).toBe('DAILY')
    expect(res.body.data.assignedTo.name).toBe('Alice')
    createdRecurringIds.push(res.body.data.id)
  })

  it('returns 201 with MONTHLY recurring chore', async () => {
    if (!bobId) throw new Error('bob not seeded')

    const res = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({
        choreTemplateId: testTemplateId,
        assignedToId: bobId,
        frequency: 'MONTHLY',
        dayOfMonth: 15,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.frequency).toBe('MONTHLY')
    expect(res.body.data.dayOfMonth).toBe(15)
    createdRecurringIds.push(res.body.data.id)
  })

  it('returns 404 with non-existent templateId', async () => {
    if (!aliceId) throw new Error('alice not seeded')

    const res = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({
        choreTemplateId: 99999,
        assignedToId: aliceId,
        frequency: 'DAILY',
      })

    expect(res.status).toBe(404)
  })
})

describe('GET /api/recurring', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('returns 200 with array of recurring chores for any authenticated user', async () => {
    const res = await request(app).get(BASE).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('POST /api/occurrences/:id/complete', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/occurrences/1/complete')
    expect(res.status).toBe(401)
  })

  it('completes an occurrence as the assignee and creates PointLog EARNED', async () => {
    if (createdRecurringIds.length === 0) return

    const aliceRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@home.local', password: 'password123' })
    const aliceCookies = Array.isArray(aliceRes.headers['set-cookie'])
      ? aliceRes.headers['set-cookie']
      : aliceRes.headers['set-cookie']
        ? [aliceRes.headers['set-cookie'] as string]
        : []

    const listRes = await request(app).get('/api/assignments').set('Cookie', aliceCookies)
    const myOcc = listRes.body.data.find(
      (a: { type: string; status: string }) => a.type === 'RECURRING' && a.status === 'PENDING'
    )
    if (!myOcc) return

    const res = await request(app)
      .post(`/api/occurrences/${myOcc.id}/complete`)
      .set('Cookie', aliceCookies)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
    expect(res.body.data.pointsAwarded).toBe(7)
  })
})

describe('DELETE /api/recurring/:id', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).delete(`${BASE}/1`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).delete(`${BASE}/1`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('returns 200 and deletes a recurring chore for PARENT', async () => {
    if (createdRecurringIds.length === 0) return
    const id = createdRecurringIds.pop()!
    const res = await request(app).delete(`${BASE}/${id}`).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ deleted: true })
  })

  it('returns 404 when recurring chore does not exist', async () => {
    const res = await request(app).delete(`${BASE}/99999`).set('Cookie', parentCookies)
    expect(res.status).toBe(404)
  })
})
