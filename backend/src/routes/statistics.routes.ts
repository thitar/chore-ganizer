import { Router } from 'express'
import * as statisticsController from '../controllers/statistics.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/statistics/family
 * @desc    Get family statistics with optional date range
 * @access  Private (Parent only)
 */
router.get('/family', authenticate, requireParent, asyncHandler(statisticsController.getFamilyStats))

/**
 * @route   GET /api/statistics/child/:childId
 * @desc    Get statistics for a specific child
 * @access  Private (Parent only)
 */
router.get('/child/:childId', authenticate, requireParent, asyncHandler(statisticsController.getChildStats))

export default router
