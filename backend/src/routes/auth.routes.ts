import { Router } from 'express'
import * as authService from '../services/auth.service'
import { authenticate } from '../middleware/auth'
import { authLimiter, recoveryLimiter } from '../middleware/rateLimiter'
import { validate } from '../middleware/validator'
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema'
import { isSmtpConfigured } from '../config/smtp'

const router = Router()

router.get('/status', (_req, res) => {
  res.json({ success: true, data: { passwordResetEnabled: isSmtpConfigured }, error: null })
})

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await authService.login(email, password)
    req.session.regenerate((err) => {
      if (err) return next(err)
      req.session.userId = user.id
      req.session.role = user.role
      res.json({ success: true, data: user, error: null })
    })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req.session)
    res.clearCookie('connect.sid')
    res.json({ success: true, data: { message: 'Logged out' }, error: null })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.session.userId!)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})

router.post('/forgot-password', recoveryLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body
    const result = await authService.forgotPassword(email)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

router.post('/reset-password', recoveryLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body
    const result = await authService.resetPassword(token, newPassword)
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
