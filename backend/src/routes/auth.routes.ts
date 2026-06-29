import { Router } from 'express'
import * as authService from '../services/auth.service'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', async (req, res, next) => {
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

export default router
