import request from 'supertest'
import { app } from '../app'

const BASE = '/api/templates'

let parentCookies: string[] = []
let childCookies: string[] = []
let createdTemplateIds: number[] = []

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
  for (const id of createdTemplateIds) {
    try {
      await request(app).delete(`${BASE}/${id}`).set('Cookie', parentCookies)
    } catch { /* ignore cleanup errors */ }
  }
})

describe('POST /api/templates', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post(BASE).send({ title: 'Test', points: 5, category: 'test' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(BASE).set('Cookie', childCookies).send({ title: 'Test', points: 5, category: 'test' })
    expect(res.status).toBe(403)
  })

  it('returns 201 with created template for PARENT', async () => {
    const res = await request(app).post(BASE).set('Cookie', parentCookies).send({ title: 'Integration Test', points: 10, category: 'testing' })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.title).toBe('Integration Test')
    createdTemplateIds.push(res.body.data.id)
  })

  it('returns 400 with validation error for missing fields', async () => {
    const res = await request(app).post(BASE).set('Cookie', parentCookies).send({})
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/templates', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('returns 200 with templates array for PARENT', async () => {
    const res = await request(app).get(BASE).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns 200 with templates array for CHILD', async () => {
    const res = await request(app).get(BASE).set('Cookie', childCookies)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('PUT /api/templates/:id', () => {
  let templateId: number

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Cookie', parentCookies).send({ title: 'Update Target', points: 5, category: 'testing' })
    templateId = res.body.data.id
    createdTemplateIds.push(templateId)
  })

  it('returns 401 without authentication', async () => {
    const res = await request(app).put(`${BASE}/${templateId}`).send({ title: 'X' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).put(`${BASE}/${templateId}`).set('Cookie', childCookies).send({ title: 'X' })
    expect(res.status).toBe(403)
  })

  it('returns 200 with updated template for PARENT', async () => {
    const res = await request(app).put(`${BASE}/${templateId}`).set('Cookie', parentCookies).send({ title: 'Updated Title' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.title).toBe('Updated Title')
  })

  it('returns 404 for non-existent template', async () => {
    const res = await request(app).put(`${BASE}/99999`).set('Cookie', parentCookies).send({ title: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/templates/:id', () => {
  let deletableId: number

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Cookie', parentCookies).send({ title: 'Delete Target', points: 5, category: 'testing' })
    deletableId = res.body.data.id
    createdTemplateIds.push(deletableId)
  })

  it('returns 401 without authentication', async () => {
    const res = await request(app).delete(`${BASE}/${deletableId}`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).delete(`${BASE}/${deletableId}`).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('returns 200 for PARENT deleting template with no completed assignments', async () => {
    const res = await request(app).delete(`${BASE}/${deletableId}`).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 for non-existent template', async () => {
    const res = await request(app).delete(`${BASE}/99999`).set('Cookie', parentCookies)
    expect(res.status).toBe(404)
  })
})
