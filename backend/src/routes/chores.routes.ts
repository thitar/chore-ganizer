import { Router } from 'express'
import * as choresController from '../controllers/chores.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/chores
 * @desc    Get all chores
 * @access  Private (Parents only)
 */
router.get(
  '/',
  authenticate,
  authorize('PARENT'),
  asyncHandler(choresController.getAllChores)
)

/**
 * @route   GET /api/chores/:id
 * @desc    Get chore by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(choresController.getChoreById)
)

/**
 * @route   POST /api/chores
 * @desc    Create a new chore
 * @access  Private (Parents only)
 */
router.post(
  '/',
  authenticate,
  authorize('PARENT'),
  asyncHandler(choresController.createChore)
)

/**
 * @route   PUT /api/chores/:id
 * @desc    Update a chore
 * @access  Private (Parents only)
 */
router.put(
  '/:id',
  authenticate,
  authorize('PARENT'),
  asyncHandler(choresController.updateChore)
)

/**
 * @route   DELETE /api/chores/:id
 * @desc    Delete a chore
 * @access  Private (Parents only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('PARENT'),
  asyncHandler(choresController.deleteChore)
)

/**
 * @route   POST /api/chores/:id/complete
 * @desc    Mark a chore as completed
 * @access  Private
 */
router.post(
  '/:id/complete',
  authenticate,
  asyncHandler(choresController.completeChore)
)

export default router
