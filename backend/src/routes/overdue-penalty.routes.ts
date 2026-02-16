import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getPenaltySettings,
  updatePenaltySettings,
  processOverdue,
  getOverdueChores,
  getPenaltyHistory,
} from '../controllers/overdue-penalty.controller.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/overdue-penalty/settings - Get penalty settings
router.get('/settings', getPenaltySettings)

// PUT /api/overdue-penalty/settings - Update penalty settings
router.put('/settings', updatePenaltySettings)

// POST /api/overdue-penalty/process - Manually trigger overdue processing
router.post('/process', processOverdue)

// GET /api/overdue-penalty/chores - Get list of overdue chores
router.get('/chores', getOverdueChores)

// GET /api/overdue-penalty/history - Get penalty history
router.get('/history', getPenaltyHistory)

export default router