import { Router } from 'express'
import * as notificationSettingsController from '../controllers/notification-settings.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/notification-settings
 * @desc    Get notification settings for current user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(notificationSettingsController.getSettings)
)

/**
 * @route   PUT /api/notification-settings
 * @desc    Update notification settings for current user
 * @access  Private
 */
router.put(
  '/',
  authenticate,
  asyncHandler(notificationSettingsController.updateSettings)
)

/**
 * @route   POST /api/notification-settings/test
 * @desc    Send test notification to verify ntfy configuration
 * @access  Private
 */
router.post(
  '/test',
  authenticate,
  asyncHandler(notificationSettingsController.sendTestNotification)
)

export default router
