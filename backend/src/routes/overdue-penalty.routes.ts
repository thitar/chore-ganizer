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

/**
 * @swagger
 * /overdue-penalty/settings:
 *   get:
 *     tags: [Overdue Penalty]
 *     summary: Get penalty settings
 *     description: Retrieve overdue penalty configuration settings (Parent-only)
 *     operationId: getPenaltySettings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Penalty settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UpdatePenaltySettingsRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.get('/settings', getPenaltySettings)

/**
 * @swagger
 * /overdue-penalty/settings:
 *   put:
 *     tags: [Overdue Penalty]
 *     summary: Update penalty settings
 *     description: Update overdue penalty configuration settings (Parent-only)
 *     operationId: updatePenaltySettings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePenaltySettingsRequest'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put('/settings', updatePenaltySettings)

/**
 * @swagger
 * /overdue-penalty/process:
 *   post:
 *     tags: [Overdue Penalty]
 *     summary: Process overdue chores
 *     description: Manually trigger overdue penalty processing (Parent-only)
 *     operationId: processOverdue
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Overdue processing completed
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
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post('/process', processOverdue)

/**
 * @swagger
 * /overdue-penalty/chores:
 *   get:
 *     tags: [Overdue Penalty]
 *     summary: Get overdue chores
 *     description: Retrieve a list of overdue chores with penalty information
 *     operationId: getOverdueChores
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Overdue chores list
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
 *                     $ref: '#/components/schemas/OverdueChore'
 *       401:
 *         description: Unauthorized
 */
router.get('/chores', getOverdueChores)

/**
 * @swagger
 * /overdue-penalty/history:
 *   get:
 *     tags: [Overdue Penalty]
 *     summary: Get penalty history
 *     description: Retrieve the history of applied overdue penalties
 *     operationId: getPenaltyHistory
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Penalty history
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
 *                     $ref: '#/components/schemas/PenaltyRecord'
 *       401:
 *         description: Unauthorized
 */
router.get('/history', getPenaltyHistory)

export default router