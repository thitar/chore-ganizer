import { Router } from 'express'
import { prisma } from '../config/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import * as usersService from '../services/users.service'

const router = Router()

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const users = await usersService.getAll()
    res.json({ success: true, data: users, error: null })
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body)
    res.status(201).json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await usersService.deleteUser(id, req.session.userId!)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.put('/me/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const result = await usersService.updatePassword(req.session.userId!, currentPassword, newPassword)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.put('/me/color', authenticate, async (req, res, next) => {
  try {
    const { color } = req.body
    const user = await usersService.updateColor(req.session.userId!, color)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})

router.put('/me/ntfy-topic', authenticate, async (req, res, next) => {
  try {
    const { ntfyTopic } = req.body
    const user = await usersService.updateNtfyTopic(req.session.userId!, ntfyTopic)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})

router.put('/:id/ntfy-topic', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id)
    if (isNaN(targetUserId)) {
      throw new AppError('Invalid user ID', 400)
    }
    const { ntfyTopic } = req.body
    const user = await usersService.updateNtfyTopic(targetUserId, ntfyTopic)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
