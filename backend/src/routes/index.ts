import { Router } from 'express'
import authRoutes from './auth.routes.js'
import choresRoutes from './chores.routes.js'
import usersRoutes from './users.routes.js'
import notificationsRoutes from './notifications.routes.js'
import * as healthController from '../controllers/health.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// Health check (no authentication required)
router.get('/health', asyncHandler(healthController.healthCheck))

// API routes
router.use('/auth', authRoutes)
router.use('/chores', choresRoutes)
router.use('/users', usersRoutes)
router.use('/notifications', notificationsRoutes)

export default router
