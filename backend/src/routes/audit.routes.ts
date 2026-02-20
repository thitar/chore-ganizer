import { Router } from 'express'
import * as auditController from '../controllers/audit.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/audit
 * @desc    Get audit logs
 * @access  Private (Parents only)
 */
router.get(
  '/',
  authenticate,
  authorize('PARENT'),
  asyncHandler(auditController.getAuditLogs)
)

export default router
