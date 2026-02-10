import { Router } from 'express'
import * as notificationsController from '../controllers/notifications.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(notificationsController.getNotifications)
)

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:id/read',
  authenticate,
  asyncHandler(notificationsController.markAsRead)
)

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/read-all',
  authenticate,
  asyncHandler(notificationsController.markAllAsRead)
)

export default router
