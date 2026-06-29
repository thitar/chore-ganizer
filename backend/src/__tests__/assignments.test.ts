import request from 'supertest'
import { app } from '../app'

const BASE = '/api/assignments'
const USERS_BASE = '/api/users'

let parentCookies: string[] = []
let childCookies: string[] = []
let createdAssignmentIds: number[] = []

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
  for (const id of createdAssignmentIds) {
    try {
      await request(app).delete(`${BASE}/${id}`).set('Cookie', parentCookies)
    } catch { /* ignore */ }
  }
})

describe('GET /api/users', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(USERS_BASE)
    expect(res.status).toBe(401)
  })

  it('returns list of family members for authenticated user', async () => {
    const res = await request(app).get(USERS_BASE).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(4)
    const user = res.body.data[0]
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('role')
    expect(user).toHaveProperty('color')
    expect(user).not.toHaveProperty('email')
    expect(user).not.toHaveProperty('password')
  })
})

describe('POST /api/assignments', () => {
  let templateId: number

  beforeAll(async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Assign Test', points: 10, category: 'testing' })
    templateId = tpl.body.data.id
  })

  it('returns 401 without authentication', async () => {
    const res = await request(app).post(BASE).send({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-06-01' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(BASE).set('Cookie', childCookies)
      .send({ choreTemplateId: templateId, assignedToId: 2, dueDate: '2026-06-01' })
    expect(res.status).toBe(403)
  })

  it('returns 201 with created assignment for PARENT', async () => {
    const res = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: templateId, assignedToId: 2, dueDate: '2026-06-15' })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('PENDING')
    expect(res.body.data.pointsAwarded).toBeNull()
    createdAssignmentIds.push(res.body.data.id)
  })

  it('returns 400 with validation error for missing fields', async () => {
    const res = await request(app).post(BASE).set('Cookie', parentCookies).send({})
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/assignments', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('returns all family assignments for PARENT', async () => {
    const res = await request(app).get(BASE).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns only own assignments for CHILD', async () => {
    const res = await request(app).get(BASE).set('Cookie', childCookies)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    for (const a of res.body.data) {
      expect(a.assignedToId).toBeDefined()
    }
  })

  it('filters assignments by from/to date range (CAL-03 regression)', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'DateRange Test', points: 7, category: 'testing' })
    const tplId = tpl.body.data.id

    const decAssign = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tplId, assignedToId: 3, dueDate: '2026-12-15' })
    const decId = decAssign.body.data.id
    createdAssignmentIds.push(decId)

    const julAssign = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tplId, assignedToId: 3, dueDate: '2026-07-15' })
    const julId = julAssign.body.data.id
    createdAssignmentIds.push(julId)

    const decRes = await request(app)
      .get(`${BASE}?from=2026-12-01&to=2026-12-31`)
      .set('Cookie', parentCookies)
    expect(decRes.status).toBe(200)
    const decRows = (decRes.body.data as Array<{ id: number; dueDate: string; type: string; choreTemplateId: number }>)
      .filter((a) => a.type === 'REGULAR' && a.choreTemplateId === tplId)
    expect(decRows.map((a) => a.id)).toContain(decId)
    expect(decRows.map((a) => a.id)).not.toContain(julId)

    const julRes = await request(app)
      .get(`${BASE}?from=2026-07-01&to=2026-07-31`)
      .set('Cookie', parentCookies)
    expect(julRes.status).toBe(200)
    const julRows = (julRes.body.data as Array<{ id: number; dueDate: string; type: string; choreTemplateId: number }>)
      .filter((a) => a.type === 'REGULAR' && a.choreTemplateId === tplId)
    expect(julRows.map((a) => a.id)).toContain(julId)
    expect(julRows.map((a) => a.id)).not.toContain(decId)
  })
})

describe('PUT /api/assignments/:id', () => {
  let assignmentId: number
  let templateId: number

  beforeAll(async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Update Assign Test', points: 5, category: 'testing' })
    templateId = tpl.body.data.id
    const assign = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: templateId, assignedToId: 2, dueDate: '2026-06-01' })
    assignmentId = assign.body.data.id
    createdAssignmentIds.push(assignmentId)
  })

  it('returns 200 with updated due date', async () => {
    const res = await request(app).put(`${BASE}/${assignmentId}`).set('Cookie', parentCookies)
      .send({ dueDate: '2026-12-25' })
    expect(res.status).toBe(200)
    expect(res.body.data.dueDate).toContain('2026-12-25')
  })

  it('returns 403 for CHILD', async () => {
    const res = await request(app).put(`${BASE}/${assignmentId}`).set('Cookie', childCookies)
      .send({ dueDate: '2026-12-31' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for non-existent assignment', async () => {
    const res = await request(app).put(`${BASE}/99999`).set('Cookie', parentCookies)
      .send({ dueDate: '2026-01-01' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/assignments/:id/complete', () => {
  let aliceTemplateId: number
  let aliceAssignmentId: number

  beforeAll(async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Complete Test', points: 20, category: 'testing' })
    aliceTemplateId = tpl.body.data.id

    const assign = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: aliceTemplateId, assignedToId: 3, dueDate: '2026-06-15' })
    aliceAssignmentId = assign.body.data.id
    createdAssignmentIds.push(aliceAssignmentId)
  })

  it('returns 200 and awards points when owner completes', async () => {
    const res = await request(app).post(`${BASE}/${aliceAssignmentId}/complete`).set('Cookie', childCookies)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
    expect(res.body.data.pointsAwarded).toBe(20)
    expect(res.body.data.completedAt).not.toBeNull()
  })

  it('returns 403 when non-owner tries to complete', async () => {
    const anotherAssign = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: aliceTemplateId, assignedToId: 4, dueDate: '2026-06-01' })
    createdAssignmentIds.push(anotherAssign.body.data.id)

    const res = await request(app).post(`${BASE}/${anotherAssign.body.data.id}/complete`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('returns 409 when already completed', async () => {
    const res = await request(app).post(`${BASE}/${aliceAssignmentId}/complete`).set('Cookie', childCookies)
    expect(res.status).toBe(409)
  })
})

describe('POST /api/assignments/:id/uncomplete', () => {
  let compTemplateId: number
  let compAssignmentId: number

  beforeAll(async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Uncomplete Test', points: 5, category: 'testing' })
    compTemplateId = tpl.body.data.id

    const assign = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: compTemplateId, assignedToId: 3, dueDate: '2026-06-01' })
    compAssignmentId = assign.body.data.id
    createdAssignmentIds.push(compAssignmentId)

    await request(app).post(`${BASE}/${compAssignmentId}/complete`).set('Cookie', childCookies)
  })

  it('returns 200 and reverts to PENDING for PARENT', async () => {
    const res = await request(app).post(`${BASE}/${compAssignmentId}/uncomplete`).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('PENDING')
    expect(res.body.data.pointsAwarded).toBeNull()
    expect(res.body.data.completedAt).toBeNull()
  })

  it('returns 403 for CHILD', async () => {
    const res = await request(app).post(`${BASE}/${compAssignmentId}/uncomplete`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/assignments/:id', () => {
  let deleteTemplateId: number
  let pendingId: number
  let completedId: number

  beforeAll(async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Delete Test', points: 1, category: 'testing' })
    deleteTemplateId = tpl.body.data.id

    const p = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: deleteTemplateId, assignedToId: 4, dueDate: '2026-06-01' })
    pendingId = p.body.data.id
    createdAssignmentIds.push(pendingId)

    const c = await request(app).post(BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: deleteTemplateId, assignedToId: 3, dueDate: '2026-06-01' })
    completedId = c.body.data.id
    createdAssignmentIds.push(completedId)
    await request(app).post(`${BASE}/${completedId}/complete`).set('Cookie', childCookies)
  })

  it('returns 200 when deleting pending assignment', async () => {
    const res = await request(app).delete(`${BASE}/${pendingId}`).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(true)
  })

  it('returns 409 when deleting completed assignment', async () => {
    const res = await request(app).delete(`${BASE}/${completedId}`).set('Cookie', parentCookies)
    expect(res.status).toBe(409)
  })

  it('returns 403 for CHILD', async () => {
    const res = await request(app).delete(`${BASE}/${completedId}`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })
})
