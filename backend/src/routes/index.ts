import { Router } from 'express'
import authRoutes from './auth.routes.js'
import choreTemplatesRoutes from './chore-templates.routes.js'
import choreAssignmentsRoutes from './chore-assignments.routes.js'
import choreCategoriesRoutes from './chore-categories.routes.js'
import usersRoutes from './users.routes.js'
import notificationsRoutes from './notifications.routes.js'
import notificationSettingsRoutes from './notification-settings.routes.js'
import overduePenaltyRoutes from './overdue-penalty.routes.js'
import * as healthController from '../controllers/health.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// Health check (no authentication required)
router.get('/health', asyncHandler(healthController.healthCheck))

// API routes
router.use('/auth', authRoutes)
router.use('/chore-templates', choreTemplatesRoutes)
router.use('/chore-assignments', choreAssignmentsRoutes)
router.use('/chore-categories', choreCategoriesRoutes)
router.use('/users', usersRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/notification-settings', notificationSettingsRoutes)
router.use('/overdue-penalty', overduePenaltyRoutes)

export default router
