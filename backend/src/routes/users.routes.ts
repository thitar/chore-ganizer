import { Router } from 'express'
import * as usersController from '../controllers/users.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Parents only)
 */
router.get(
  '/',
  authenticate,
  authorize('PARENT'),
  asyncHandler(usersController.getAllUsers)
)

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Parents only)
 */
router.get(
  '/:id',
  authenticate,
  authorize('PARENT'),
  asyncHandler(usersController.getUserById)
)

/**
 * @route   GET /api/users/:id/chores
 * @desc    Get chores assigned to a user
 * @access  Private
 */
router.get(
  '/:id/chores',
  authenticate,
  asyncHandler(usersController.getUserChores)
)

export default router
