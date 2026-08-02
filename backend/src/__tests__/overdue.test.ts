import request from 'supertest'
import { app } from '../app'

const BASE = '/api/overdue'
const ASSIGNMENTS_BASE = '/api/assignments'

let parentCookies: string[] = []
let childCookies: string[] = []
let cleanupIds: number[] = []

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

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
})

afterAll(async () => {
  for (const id of cleanupIds) {
    try {
      await request(app).delete(`${ASSIGNMENTS_BASE}/${id}`).set('Cookie', parentCookies)
    } catch { /* ignore */ }
  }
})

describe('GET /api/overdue', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).get(BASE).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('lists a past-due PENDING assignment for PARENT', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Overdue List Test', points: 10, category: 'testing' })
    const created = await request(app).post(ASSIGNMENTS_BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 3, dueDate: yesterday() })
    cleanupIds.push(created.body.data.id)

    const res = await request(app).get(BASE).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    const rows = (res.body.data as Array<{ id: number; type: string; choreTemplateId: number }>)
      .filter((a) => a.type === 'REGULAR' && a.choreTemplateId === tpl.body.data.id)
    expect(rows.map((a) => a.id)).toContain(created.body.data.id)
  })
})

describe('POST /api/overdue/cancel', () => {
  it('cancels an overdue assignment with a penalty and returns CANCELLED', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Overdue Cancel Test', points: 10, category: 'testing' })
    const created = await request(app).post(ASSIGNMENTS_BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 3, dueDate: yesterday() })
    const id = created.body.data.id
    cleanupIds.push(id)

    const res = await request(app).post(`${BASE}/cancel`).set('Cookie', parentCookies)
      .send({ id, type: 'REGULAR', penalty: 6 })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CANCELLED')
    expect(res.body.data.penaltyPoints).toBe(6)
  })

  it('returns 404 for a non-existent chore', async () => {
    const res = await request(app).post(`${BASE}/cancel`).set('Cookie', parentCookies)
      .send({ id: 999999, type: 'REGULAR', penalty: 5 })
    expect(res.status).toBe(404)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(`${BASE}/cancel`).set('Cookie', childCookies)
      .send({ id: 1, type: 'REGULAR', penalty: 5 })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/overdue/reschedule', () => {
  it('moves a REGULAR assignment to a new due date', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Overdue Reschedule Test', points: 5, category: 'testing' })
    const created = await request(app).post(ASSIGNMENTS_BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 3, dueDate: yesterday() })
    const id = created.body.data.id
    cleanupIds.push(id)

    const res = await request(app).post(`${BASE}/reschedule`).set('Cookie', parentCookies)
      .send({ id, dueDate: '2026-08-20' })
    expect(res.status).toBe(200)
    expect(res.body.data.dueDate).toContain('2026-08-20')
  })

  it('returns 400 with invalid due date', async () => {
    const res = await request(app).post(`${BASE}/reschedule`).set('Cookie', parentCookies)
      .send({ id: 1, dueDate: 'not-a-date' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
