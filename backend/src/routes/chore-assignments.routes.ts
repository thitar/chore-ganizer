import { Router } from 'express'
import * as assignmentsController from '../controllers/chore-assignments.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/chore-assignments
 * @desc    Get all chore assignments with optional filters
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(assignmentsController.getAssignments))

/**
 * @route   GET /api/chore-assignments/upcoming
 * @desc    Get upcoming assignments (next N days)
 * @access  Private
 */
router.get('/upcoming', authenticate, asyncHandler(assignmentsController.getUpcoming))

/**
 * @route   GET /api/chore-assignments/overdue
 * @desc    Get overdue assignments
 * @access  Private
 */
router.get('/overdue', authenticate, asyncHandler(assignmentsController.getOverdue))

/**
 * @route   GET /api/chore-assignments/calendar
 * @desc    Get assignments for a month (calendar view)
 * @access  Private
 */
router.get('/calendar', authenticate, asyncHandler(assignmentsController.getCalendar))

/**
 * @route   GET /api/chore-assignments/:id
 * @desc    Get a single chore assignment
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(assignmentsController.getAssignment))

/**
 * @route   POST /api/chore-assignments
 * @desc    Create a new chore assignment
 * @access  Private (Parents only)
 */
router.post('/', authenticate, requireParent, asyncHandler(assignmentsController.createAssignment))

/**
 * @route   PUT /api/chore-assignments/:id
 * @desc    Update a chore assignment (reschedule, reassign)
 * @access  Private (Parents only)
 */
router.put('/:id', authenticate, requireParent, asyncHandler(assignmentsController.updateAssignment))

/**
 * @route   POST /api/chore-assignments/:id/complete
 * @desc    Complete a chore assignment (awards points)
 * @access  Private
 */
router.post('/:id/complete', authenticate, asyncHandler(assignmentsController.completeAssignment))

/**
 * @route   DELETE /api/chore-assignments/:id
 * @desc    Delete a chore assignment
 * @access  Private (Parents only)
 */
router.delete('/:id', authenticate, requireParent, asyncHandler(assignmentsController.deleteAssignment))

export default router