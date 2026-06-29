import { Router } from 'express'
import * as assignmentService from '../services/assignment.service'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { createAssignmentSchema, updateAssignmentSchema } from '../schemas/assignment.schema'

const router = Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { from, to } = req.query
    if (from !== undefined && typeof from !== 'string') {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'from must be an ISO date string' } })
    }
    if (to !== undefined && typeof to !== 'string') {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'to must be an ISO date string' } })
    }
    if (from !== undefined && Number.isNaN(Date.parse(from))) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'from must be a valid ISO date' } })
    }
    if (to !== undefined && Number.isNaN(Date.parse(to))) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'to must be a valid ISO date' } })
    }
    const assignments = await assignmentService.getAll(
      req.session.userId!,
      req.session.role!,
      from as string | undefined,
      to as string | undefined
    )
    res.json({ success: true, data: assignments, error: null })
  } catch (err) {
    next(err)
  }
})

router.post(
  '/',
  authenticate,
  authorize('PARENT'),
  validate(createAssignmentSchema),
  async (req, res, next) => {
    try {
      const assignment = await assignmentService.create(req.body)
      res.status(201).json({ success: true, data: assignment, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.put(
  '/:id',
  authenticate,
  authorize('PARENT'),
  validate(updateAssignmentSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      const assignment = await assignmentService.update(id, req.body)
      res.json({ success: true, data: assignment, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.delete(
  '/:id',
  authenticate,
  authorize('PARENT'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      const result = await assignmentService.delete_(id)
      res.json({ success: true, data: result, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/:id/complete',
  authenticate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      const assignment = await assignmentService.complete(id, req.session.userId!)
      res.json({ success: true, data: assignment, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/:id/uncomplete',
  authenticate,
  authorize('PARENT'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      const assignment = await assignmentService.uncomplete(id)
      res.json({ success: true, data: assignment, error: null })
    } catch (err) {
      next(err)
    }
  }
)

export default router
