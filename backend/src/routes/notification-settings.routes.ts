import { Router } from 'express'
import * as notificationSettingsController from '../controllers/notification-settings.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * @swagger
 * /notification-settings:
 *   get:
 *     tags: [Notification Settings]
 *     summary: Get notification settings
 *     description: Retrieve notification settings for the current user
 *     operationId: getSettings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Notification settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NotificationSettings'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  asyncHandler(notificationSettingsController.getSettings)
)

/**
 * @swagger
 * /notification-settings/defaults:
 *   get:
 *     tags: [Notification Settings]
 *     summary: Get default notification settings
 *     description: Retrieve default notification settings from environment variables
 *     operationId: getDefaults
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Default notification settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NotificationSettings'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/defaults',
  authenticate,
  asyncHandler(notificationSettingsController.getDefaults)
)

/**
 * @swagger
 * /notification-settings:
 *   put:
 *     tags: [Notification Settings]
 *     summary: Update notification settings
 *     description: Update notification settings for the current user
 *     operationId: updateSettings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNotificationSettingsRequest'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NotificationSettings'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/',
  authenticate,
  asyncHandler(notificationSettingsController.updateSettings)
)

/**
 * @swagger
 * /notification-settings/test:
 *   post:
 *     tags: [Notification Settings]
 *     summary: Send test notification
 *     description: Send a test notification to verify ntfy configuration
 *     operationId: sendTestNotification
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to send test notification
 */
router.post(
  '/test',
  authenticate,
  asyncHandler(notificationSettingsController.sendTestNotification)
)

export default router
