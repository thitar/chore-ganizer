import { Router } from 'express'
import * as recurringChoresController from '../controllers/recurring-chores.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, idParamSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @route   POST /api/recurring-chores
 * @desc    Create a new recurring chore
 * @access  Private (Parents only)
 */
router.post('/', authenticate, requireParent, asyncHandler(recurringChoresController.createRecurringChore))

/**
 * @route   GET /api/recurring-chores
 * @desc    List all recurring chores for the family
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(recurringChoresController.listRecurringChores))

/**
 * @route   GET /api/recurring-chores/occurrences
 * @desc    List occurrences for the next 30 days
 * @access  Private
 */
router.get('/occurrences', authenticate, asyncHandler(recurringChoresController.listOccurrences))

/**
 * @route   GET /api/recurring-chores/:id
 * @desc    Get a specific recurring chore
 * @access  Private
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.getRecurringChore))

/**
 * @route   PUT /api/recurring-chores/:id
 * @desc    Update a recurring chore (affects all future occurrences)
 * @access  Private (Parents only)
 */
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.updateRecurringChore))

/**
 * @route   DELETE /api/recurring-chores/:id
 * @desc    Delete a recurring chore (soft delete by setting isActive=false)
 * @access  Private (Parents only)
 */
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.deleteRecurringChore))

/**
 * @route   PATCH /api/recurring-chores/occurrences/:id/complete
 * @desc    Mark occurrence as completed
 * @access  Private
 */
router.patch('/occurrences/:id/complete', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.completeOccurrence))

/**
 * @route   PATCH /api/recurring-chores/occurrences/:id/skip
 * @desc    Skip an occurrence
 * @access  Private
 */
router.patch('/occurrences/:id/skip', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.skipOccurrence))

/**
 * @route   PATCH /api/recurring-chores/occurrences/:id/unskip
 * @desc    Unskip a previously skipped occurrence
 * @access  Private
 */
router.patch('/occurrences/:id/unskip', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.unskipOccurrence))

/**
 * @route   POST /api/recurring-chores/trigger-occurrences
 * @desc    Manually trigger occurrence generation (for testing/admin purposes)
 * @access  Private (Parents only)
 */
router.post('/trigger-occurrences', authenticate, requireParent, asyncHandler(recurringChoresController.triggerOccurrenceGeneration))

export default router
