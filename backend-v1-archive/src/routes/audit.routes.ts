import { Router } from 'express'
import * as auditController from '../controllers/audit.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

/**
 * @swagger
 * /audit:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get audit logs
 *     description: Retrieve audit logs for all system actions (Parent-only)
 *     operationId: getAuditLogs
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
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
 *                     $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.get(
  '/',
  authenticate,
  authorize('PARENT'),
  asyncHandler(auditController.getAuditLogs)
)

export default router
