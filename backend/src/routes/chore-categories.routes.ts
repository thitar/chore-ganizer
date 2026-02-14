import { Router } from 'express'
import * as categoriesController from '../controllers/chore-categories.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/chore-categories
 * @desc    Get all chore categories
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(categoriesController.getCategories))

/**
 * @route   GET /api/chore-categories/:id
 * @desc    Get a single chore category
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(categoriesController.getCategory))

/**
 * @route   GET /api/chore-categories/:id/templates
 * @desc    Get templates by category
 * @access  Private
 */
router.get('/:id/templates', authenticate, asyncHandler(categoriesController.getCategoryTemplates))

/**
 * @route   POST /api/chore-categories
 * @desc    Create a new chore category
 * @access  Private (Parents only)
 */
router.post('/', authenticate, requireParent, asyncHandler(categoriesController.createCategory))

/**
 * @route   PUT /api/chore-categories/:id
 * @desc    Update a chore category
 * @access  Private (Parents only)
 */
router.put('/:id', authenticate, requireParent, asyncHandler(categoriesController.updateCategory))

/**
 * @route   DELETE /api/chore-categories/:id
 * @desc    Delete a chore category
 * @access  Private (Parents only)
 */
router.delete('/:id', authenticate, requireParent, asyncHandler(categoriesController.deleteCategory))

export default router
