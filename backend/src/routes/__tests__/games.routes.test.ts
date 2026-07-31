import request from 'supertest'
import express from 'express'
import gamesRouter from '../games.routes'
import { errorHandler, AppError } from '../../middleware/errorHandler'
import { csrfProtection } from '../../middleware/csrf'

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}))

jest.mock('../../services/games.service', () => ({
  getGames: jest.fn(),
  recordPongScore: jest.fn(),
}))

const { prisma } = require('../../config/prisma')
const gamesService = require('../../services/games.service')

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    req.session = {} as typeof req.session
    if (req.header('x-test-session') === 'authenticated') {
      req.session = { userId: 7, role: 'CHILD' } as typeof req.session
    }
    next()
  })
  app.use('/api', csrfProtection)
  app.use('/api/games', gamesRouter)
  app.use(errorHandler)
  return app
}

describe('games.routes', () => {
  let app: express.Express

  beforeEach(() => {
    app = createTestApp()
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: 7 })
  })

  function authenticatedRequest(method: 'get' | 'post', path: string) {
    const req = method === 'get' ? request(app).get(path) : request(app).post(path)
    return req.set('x-test-session', 'authenticated')
  }

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/games/me')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: { message: 'Authentication required' },
    })
  })

  it('delegates GET /me with the session user and role', async () => {
    const games = { pong: { unlocked: true, personalBest: 12, leaderboard: [] } }
    gamesService.getGames.mockResolvedValue(games)
    const res = await authenticatedRequest('get', '/api/games/me')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: games, error: null })
    expect(gamesService.getGames).toHaveBeenCalledWith(7, 'CHILD')
  })

  it('rejects a negative score', async () => {
    const res = await authenticatedRequest('post', '/api/games/pong/scores').send({ score: -1 })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(gamesService.recordPongScore).not.toHaveBeenCalled()
  })

  it('rejects a fractional score', async () => {
    const res = await authenticatedRequest('post', '/api/games/pong/scores').send({ score: 1.5 })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(gamesService.recordPongScore).not.toHaveBeenCalled()
  })

  it('records a zero score with 201', async () => {
    const result = { personalBest: 0, isNewBest: true }
    gamesService.recordPongScore.mockResolvedValue(result)
    const res = await authenticatedRequest('post', '/api/games/pong/scores').send({ score: 0 })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ success: true, data: result, error: null })
    expect(gamesService.recordPongScore).toHaveBeenCalledWith(7, 'CHILD', 0)
  })

  it('records a positive score with 201', async () => {
    const result = { personalBest: 7, isNewBest: true }
    gamesService.recordPongScore.mockResolvedValue(result)
    const res = await authenticatedRequest('post', '/api/games/pong/scores').send({ score: 7 })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ success: true, data: result, error: null })
    expect(gamesService.recordPongScore).toHaveBeenCalledWith(7, 'CHILD', 7)
  })

  it('forwards service 403 errors', async () => {
    gamesService.recordPongScore.mockRejectedValue(new AppError('Pong is locked', 403))
    const res = await authenticatedRequest('post', '/api/games/pong/scores').send({ score: 10 })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: { message: 'Pong is locked' },
    })
  })
})
