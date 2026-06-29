import { Router } from 'express'
import * as templateService from '../services/template.service'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { createTemplateSchema, updateTemplateSchema } from '../schemas/template.schema'

const router = Router()

router.post(
  '/',
  authenticate,
  authorize('PARENT'),
  validate(createTemplateSchema),
  async (req, res, next) => {
    try {
      const template = await templateService.create({
        ...req.body,
        createdById: req.session.userId!,
      })
      res.status(201).json({ success: true, data: template, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const templates = await templateService.getAll()
    res.json({ success: true, data: templates, error: null })
  } catch (err) {
    next(err)
  }
})

router.put(
  '/:id',
  authenticate,
  authorize('PARENT'),
  validate(updateTemplateSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10)
      const template = await templateService.update(id, req.body)
      res.json({ success: true, data: template, error: null })
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
      const result = await templateService.delete_(id)
      res.json({ success: true, data: result, error: null })
    } catch (err) {
      next(err)
    }
  }
)

export default router
