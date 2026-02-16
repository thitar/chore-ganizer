import { Router } from 'express'
import * as templatesController from '../controllers/chore-templates.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, createChoreTemplateSchema, updateChoreTemplateSchema, idParamSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @route   GET /api/chore-templates
 * @desc    Get all chore templates
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(templatesController.getTemplates))

/**
 * @route   GET /api/chore-templates/:id
 * @desc    Get a single chore template
 * @access  Private
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(templatesController.getTemplate))

/**
 * @route   POST /api/chore-templates
 * @desc    Create a new chore template
 * @access  Private (Parents only)
 */
router.post('/', authenticate, requireParent, validate(createChoreTemplateSchema), asyncHandler(templatesController.createTemplate))

/**
 * @route   PUT /api/chore-templates/:id
 * @desc    Update a chore template
 * @access  Private (Parents only)
 */
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), validate(updateChoreTemplateSchema), asyncHandler(templatesController.updateTemplate))

/**
 * @route   DELETE /api/chore-templates/:id
 * @desc    Delete a chore template
 * @access  Private (Parents only)
 */
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(templatesController.deleteTemplate))

export default router