import { Router } from 'express'
import * as recurringService from '../services/recurring.service'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await recurringService.completeOccurrence(id, req.session.userId!)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
