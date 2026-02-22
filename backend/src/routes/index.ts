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
import * as healthController from '../controllers/health.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { VERSION, BUILD_DATE, FULL_VERSION } from '../version.js'

const router = Router()

// Health check endpoints (no authentication required)
router.get('/health', asyncHandler(healthController.healthCheck))
router.get('/health/live', healthController.livenessCheck)
router.get('/health/ready', asyncHandler(healthController.readinessCheck))
router.get('/health/cache', healthController.getCacheStatsHandler)

// Security.txt endpoint (RFC 9116, no authentication required)
router.get('/.well-known/security.txt', healthController.getSecurityTxt)

// Version endpoint (no authentication required)
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

export default router
