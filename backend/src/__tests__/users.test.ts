import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/prisma'

const BASE = '/api/users'

let parentCookies: string[] = []
let childCookies: string[] = []
let aliceId: number | null = null
let bobId: number | null = null
let createdUserIds: number[] = []

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

afterAll(async () => {
  for (const id of createdUserIds) {
    try {
      // Clean up any FK references first so the user delete doesn't P2003
      await prisma.choreAssignment.deleteMany({ where: { assignedToId: id } })
      await prisma.pointLog.deleteMany({ where: { userId: id } })
      await prisma.recurringChore.deleteMany({ where: { OR: [{ assignedToId: id }, { createdById: id }] } })
      await prisma.user.delete({ where: { id } })
    } catch { /* ignore */ }
  }
})

describe('POST /api/users', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post(BASE).send({})
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(BASE).set('Cookie', childCookies).send({})
    expect(res.status).toBe(403)
  })

  it('returns 201 with created user for PARENT', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({
        name: 'Test Child',
        email: `test-${Date.now()}@home.local`,
        password: 'password123',
        role: 'CHILD',
        color: '#3B82F6',
      })
    expect(res.status).toBe(201)
    expect(res.body.data.email).toContain('@home.local')
    expect(res.body.data.role).toBe('CHILD')
    if (res.body.data.id) createdUserIds.push(res.body.data.id)
  })

  it('returns 400 on invalid email', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({ name: 'X', email: 'not-email', password: 'password123', role: 'CHILD', color: '#000000' })
    expect(res.status).toBe(400)
  })

  it('returns 400 on short password', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({ name: 'X', email: 'new@home.local', password: '12345', role: 'CHILD', color: '#000000' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/users/:id', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).delete(`${BASE}/1`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).delete(`${BASE}/1`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('returns 400 on self-delete', async () => {
    const res = await request(app).delete(`${BASE}/1`).set('Cookie', parentCookies)
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent user', async () => {
    const res = await request(app).delete(`${BASE}/99999`).set('Cookie', parentCookies)
    expect(res.status).toBe(404)
  })

  it('returns 200 and deletes a child user for PARENT', async () => {
    // Create a user first
    const createRes = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({
        name: 'To Delete',
        email: `delete-${Date.now()}@home.local`,
        password: 'password123',
        role: 'CHILD',
        color: '#3B82F6',
      })
    const newId = createRes.body.data.id
    if (!newId) throw new Error('create failed')

    const res = await request(app).delete(`${BASE}/${newId}`).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ deleted: true })
  })

  it('returns 409 when user has chore assignments (AUTH-04 regression)', async () => {
    const childEmail = `with-chores-${Date.now()}@home.local`
    const createRes = await request(app)
      .post(BASE)
      .set('Cookie', parentCookies)
      .send({
        name: 'Child With Chores',
        email: childEmail,
        password: 'password123',
        role: 'CHILD',
        color: '#3B82F6',
      })
    const childId = createRes.body.data.id
    if (!childId) throw new Error('create failed')
    createdUserIds.push(childId)

    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Auth04 Test Chore', points: 5, category: 'testing' })
    const tplId = tpl.body.data.id
    if (!tplId) throw new Error('template create failed')

    const assignRes = await request(app)
      .post('/api/assignments')
      .set('Cookie', parentCookies)
      .send({ choreTemplateId: tplId, assignedToId: childId, dueDate: '2026-08-15' })
    if (assignRes.status !== 201) throw new Error(`assignment create failed: ${assignRes.status}`)

    const res = await request(app).delete(`${BASE}/${childId}`).set('Cookie', parentCookies)
    expect(res.status).toBe(409)
    expect(res.body.error.message).toMatch(/assignment/i)
  })
})

describe('PUT /api/users/me/password', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).put(`${BASE}/me/password`).send({})
    expect(res.status).toBe(401)
  })

  it('returns 401 on wrong current password', async () => {
    if (!aliceId) return
    const res = await request(app)
      .put(`${BASE}/me/password`)
      .set('Cookie', childCookies)
      .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword1' })
    expect(res.status).toBe(401)
  })

  it('returns 400 on short new password', async () => {
    if (!aliceId) return
    const res = await request(app)
      .put(`${BASE}/me/password`)
      .set('Cookie', childCookies)
      .send({ currentPassword: 'password123', newPassword: '12345' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/users', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('returns 200 with the list of family members for any authenticated user (parent or child)', async () => {
    const parentRes = await request(app).get(BASE).set('Cookie', parentCookies)
    expect(parentRes.status).toBe(200)
    expect(parentRes.body.success).toBe(true)
    expect(Array.isArray(parentRes.body.data)).toBe(true)
    expect(parentRes.body.data.length).toBeGreaterThanOrEqual(4)
    for (const u of parentRes.body.data) {
      expect(u).toHaveProperty('id')
      expect(u).toHaveProperty('name')
      expect(u).toHaveProperty('role')
      expect(u).toHaveProperty('color')
      expect(u).not.toHaveProperty('email')
      expect(u).not.toHaveProperty('password')
    }

    const childRes = await request(app).get(BASE).set('Cookie', childCookies)
    expect(childRes.status).toBe(200)
    expect(Array.isArray(childRes.body.data)).toBe(true)
    expect(childRes.body.data.length).toBe(parentRes.body.data.length)
  })
})

describe('PUT /api/users/me/color', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).put(`${BASE}/me/color`).send({})
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid color', async () => {
    if (!aliceId) return
    const res = await request(app)
      .put(`${BASE}/me/color`)
      .set('Cookie', childCookies)
      .send({ color: 'red' })
    expect(res.status).toBe(400)
  })

  it('returns 200 on valid color', async () => {
    if (!aliceId) return
    const res = await request(app)
      .put(`${BASE}/me/color`)
      .set('Cookie', childCookies)
      .send({ color: '#FF00FF' })
    expect(res.status).toBe(200)
    expect(res.body.data.color).toBe('#FF00FF')
    // Reset
    await request(app)
      .put(`${BASE}/me/color`)
      .set('Cookie', childCookies)
      .send({ color: '#10B981' })
  })
})
