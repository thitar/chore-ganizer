import { Router } from 'express'
import * as pointsService from '../services/points.service'
import * as gamificationService from '../services/gamification.service'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { adjustPointsSchema } from '../schemas/points.schema'

const router = Router()

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pointsService.getMyPoints(req.session.userId!)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.get('/leaderboard', authenticate, async (_req, res, next) => {
  try {
    const result = await pointsService.getLeaderboard()
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.get('/gamification', authenticate, async (req, res, next) => {
  try {
    const result = await gamificationService.getGamification(req.session.userId!)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.get('/users/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await pointsService.getUserPoints(
      id,
      req.session.userId!,
      req.session.role!
    )
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.post('/adjust', authenticate, authorize('PARENT'), validate(adjustPointsSchema), async (req, res, next) => {
  try {
    const { userId, amount, reason } = req.body
    const log = await pointsService.adjustPoints(userId, amount, reason)
    res.status(201).json({ success: true, data: log, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
