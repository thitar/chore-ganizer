import { Router } from 'express'
import * as notificationsController from '../controllers/notifications.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get all notifications
 *     description: Retrieve all notifications for the current user
 *     operationId: getNotifications
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  asyncHandler(notificationsController.getNotifications)
)

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     operationId: markAsRead
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.put(
  '/:id/read',
  authenticate,
  asyncHandler(notificationsController.markAsRead)
)

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Mark all notifications for current user as read
 *     operationId: markAllAsRead
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/read-all',
  authenticate,
  asyncHandler(notificationsController.markAllAsRead)
)

/**
 * @swagger
 * /notifications/check-overdue:
 *   post:
 *     tags: [Notifications]
 *     summary: Check for overdue chores
 *     description: Check for overdue chores and create notifications
 *     operationId: checkOverdue
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Overdue check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/check-overdue',
  authenticate,
  asyncHandler(notificationsController.checkOverdue)
)

export default router
