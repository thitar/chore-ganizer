import { Router, Request, Response } from 'express'
import authRoutes from './auth.routes.js'
import choreTemplatesRoutes from './chore-templates.routes.js'
import choreAssignmentsRoutes from './chore-assignments.routes.js'
import choreCategoriesRoutes from './chore-categories.routes.js'
import usersRoutes from './users.routes.js'
import notificationsRoutes from './notifications.routes.js'
import notificationSettingsRoutes from './notification-settings.routes.js'
import overduePenaltyRoutes from './overdue-penalty.routes.js'
import recurringChoresRoutes from './recurring-chores.routes.js'
import pocketMoneyRoutes from './pocket-money.routes.js'
import auditRoutes from './audit.routes.js'
import statisticsRoutes from './statistics.routes.js'
import * as healthController from '../controllers/health.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { VERSION, BUILD_DATE, FULL_VERSION } from '../version.js'

const router = Router()

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Full health check
 *     description: Returns DB, memory, and disk health. Returns 503 if degraded or error.
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnhancedHealthResponse'
 */
router.get('/health', asyncHandler(healthController.healthCheck))

/**
 * @swagger
 * /health/live:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Kubernetes-style liveness probe — checks if server is running.
 *     responses:
 *       200:
 *         description: Server is alive
 */
router.get('/health/live', healthController.livenessCheck)

/**
 * @swagger
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Returns 503 if database is not reachable.
 *     responses:
 *       200:
 *         description: API is ready
 *       503:
 *         description: Not ready
 */
router.get('/health/ready', asyncHandler(healthController.readinessCheck))

/**
 * @swagger
 * /health/cache:
 *   get:
 *     tags: [Health]
 *     summary: Cache statistics
 *     description: Returns template and category cache stats.
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get('/health/cache', healthController.getCacheStatsHandler)

/**
 * @swagger
 * /.well-known/security.txt:
 *   get:
 *     tags: [Security]
 *     summary: Security contact information (RFC 9116)
 *     responses:
 *       200:
 *         description: Security disclosure info
 */
router.get('/.well-known/security.txt', healthController.getSecurityTxt)

/**
 * @swagger
 * /version:
 *   get:
 *     tags: [Health]
 *     summary: Get API version
 *     responses:
 *       200:
 *         description: Version information
 */
router.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: VERSION,
    buildDate: BUILD_DATE,
    fullVersion: FULL_VERSION
  })
})

// API routes
router.use('/auth', authRoutes)
router.use('/chore-templates', choreTemplatesRoutes)
router.use('/chore-assignments', choreAssignmentsRoutes)
router.use('/chore-categories', choreCategoriesRoutes)
router.use('/users', usersRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/notification-settings', notificationSettingsRoutes)
router.use('/overdue-penalty', overduePenaltyRoutes)
router.use('/recurring-chores', recurringChoresRoutes)
router.use('/pocket-money', pocketMoneyRoutes)
router.use('/audit', auditRoutes)
router.use('/statistics', statisticsRoutes)

export default router
