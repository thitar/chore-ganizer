import { Router } from 'express'
import * as pointsService from '../services/points.service'
import * as gamificationService from '../services/gamification.service'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { adjustPointsSchema } from '../schemas/points.schema'

const router = Router()

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_ONLY.test(dateStr)) return false
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return false
  const [year, month, day] = dateStr.split('-').map(Number)
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

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

router.get('/weekly', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const result = await pointsService.getWeeklyPoints()
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.get('/stats', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const { from, to } = req.query
    if (from !== undefined && typeof from !== 'string') {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'from must be an ISO date string' } })
    }
    if (to !== undefined && typeof to !== 'string') {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'to must be an ISO date string' } })
    }
    if (from !== undefined && !isValidCalendarDate(from)) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'from must be a valid YYYY-MM-DD date' } })
    }
    if (to !== undefined && !isValidCalendarDate(to)) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'to must be a valid YYYY-MM-DD date' } })
    }
    const result = await pointsService.getPointsStats(from as string | undefined, to as string | undefined)
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
