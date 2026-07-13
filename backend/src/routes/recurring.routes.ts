import { Router } from 'express'
import * as recurringService from '../services/recurring.service'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { createRecurringSchema } from '../schemas/recurring.schema'

const router = Router()

router.post('/', authenticate, authorize('PARENT'), validate(createRecurringSchema), async (req, res, next) => {
  try {
    const chore = await recurringService.create({
      ...req.body,
      createdById: req.session.userId!,
    })
    res.status(201).json({ success: true, data: chore, error: null })
  } catch (err) {
    next(err)
  }
})

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const chores = await recurringService.getAll()
    res.json({ success: true, data: chores, error: null })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await recurringService.delete_(id)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
