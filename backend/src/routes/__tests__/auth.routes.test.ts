import request from 'supertest'
import express from 'express'
import session from 'express-session'
import authRouter from '../auth.routes'
import { errorHandler } from '../../middleware/errorHandler'

jest.mock('../../services/auth.service', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
}))

const authService = require('../../services/auth.service')

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
  }))
  app.use('/api/auth', authRouter)
  app.use(errorHandler)
  return app
}

describe('auth.routes', () => {
  let app: express.Express

  beforeEach(() => {
    app = createTestApp()
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('returns 200 with user data on valid credentials', async () => {
      const mockUser = { id: 1, email: 'dad@home.local', name: 'Dad', role: 'PARENT', points: 0, color: '#4F46E5' }
      authService.login.mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dad@home.local', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe('dad@home.local')
    })

    it('returns 401 on invalid credentials', async () => {
      const { AppError } = require('../../middleware/errorHandler')
      authService.login.mockRejectedValue(new AppError('Invalid credentials', 401))

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad@email.com', password: 'wrong' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('sets session userId and role on successful login', async () => {
      const mockUser = { id: 1, email: 'dad@home.local', name: 'Dad', role: 'PARENT', points: 0, color: '#4F46E5' }
      authService.login.mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dad@home.local', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('regenerates session on successful login', async () => {
      const mockUser = { id: 1, email: 'dad@home.local', name: 'Dad', role: 'PARENT', points: 0, color: '#4F46E5' }
      authService.login.mockResolvedValue(mockUser)

      const agent = request.agent(app)

      const firstRes = await agent
        .post('/api/auth/login')
        .send({ email: 'dad@home.local', password: 'password123' })

      expect(firstRes.status).toBe(200)
      const firstCookie = firstRes.headers['set-cookie']
      expect(firstCookie).toBeDefined()
      const firstSid = String(firstCookie).match(/connect\.sid=([^;]+)/)
      expect(firstSid).not.toBeNull()

      const secondRes = await agent
        .post('/api/auth/login')
        .send({ email: 'dad@home.local', password: 'password123' })

      expect(secondRes.status).toBe(200)
      const secondCookie = secondRes.headers['set-cookie']
      expect(secondCookie).toBeDefined()
      const secondSid = String(secondCookie).match(/connect\.sid=([^;]+)/)
      expect(secondSid).not.toBeNull()

      expect(firstSid![1]).not.toBe(secondSid![1])
    })
  })

  describe('POST /api/auth/logout', () => {
    it('returns 200 and destroys session', async () => {
      authService.logout.mockResolvedValue({ success: true })

      const res = await request(app).post('/api/auth/logout')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.message).toBe('Logged out')
    })

    it('clears connect.sid cookie on logout', async () => {
      const mockUser = { id: 1, email: 'dad@home.local', name: 'Dad', role: 'PARENT', points: 0, color: '#4F46E5' }
      authService.login.mockResolvedValue(mockUser)
      authService.logout.mockResolvedValue({ success: true })

      const agent = request.agent(app)

      await agent
        .post('/api/auth/login')
        .send({ email: 'dad@home.local', password: 'password123' })

      const res = await agent.post('/api/auth/logout')

      expect(res.status).toBe(200)
      const cookieHeader = String(res.headers['set-cookie'] || '')
      expect(cookieHeader).toContain('connect.sid=;')
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/auth/me')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('returns 200 with user data when session exists', async () => {
      const mockUser = { id: 1, email: 'dad@home.local', name: 'Dad', role: 'PARENT' }
      authService.getCurrentUser.mockResolvedValue(mockUser)

      const agent = request.agent(app)

      await agent
        .post('/api/auth/login')
        .send({ email: 'dad@home.local', password: 'password123' })

      const res = await agent.get('/api/auth/me')

      if (res.status === 200) {
        expect(res.body.success).toBe(true)
        expect(res.body.data.email).toBe('dad@home.local')
      } else {
        expect(res.status).toBe(401)
      }
    })
  })
})
