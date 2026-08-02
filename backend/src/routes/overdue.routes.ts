import { Router } from 'express'
import * as overdueService from '../services/overdue.service'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { cancelOverdueSchema, rescheduleOverdueSchema } from '../schemas/overdue.schema'

const router = Router()

router.get('/', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const items = await overdueService.listOverdue()
    res.json({ success: true, data: items, error: null })
  } catch (err) {
    next(err)
  }
})

router.post(
  '/cancel',
  authenticate,
  authorize('PARENT'),
  validate(cancelOverdueSchema),
  async (req, res, next) => {
    try {
      const item = await overdueService.cancel(req.body)
      res.json({ success: true, data: item, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/reschedule',
  authenticate,
  authorize('PARENT'),
  validate(rescheduleOverdueSchema),
  async (req, res, next) => {
    try {
      const item = await overdueService.reschedule(req.body)
      res.json({ success: true, data: item, error: null })
    } catch (err) {
      next(err)
    }
  }
)

export default router
