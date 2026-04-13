import { Router } from 'express'
import * as statisticsController from '../controllers/statistics.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'

const router = Router()

/**
 * @swagger
 * /statistics/family:
 *   get:
 *     tags: [Statistics]
 *     summary: Get family statistics
 *     description: Retrieve family-wide statistics including completion rates and top performers (Parent-only)
 *     operationId: getFamilyStats
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Family statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FamilyStatistics'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.get('/family', authenticate, requireParent, asyncHandler(statisticsController.getFamilyStats))

/**
 * @swagger
 * /statistics/child/{childId}:
 *   get:
 *     tags: [Statistics]
 *     summary: Get child statistics
 *     description: Retrieve statistics for a specific child including completion rates and recent activity (Parent-only)
 *     operationId: getChildStats
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: childId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChildStatistics'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 *       404:
 *         description: Child not found
 */
router.get('/child/:childId', authenticate, requireParent, asyncHandler(statisticsController.getChildStats))

export default router
