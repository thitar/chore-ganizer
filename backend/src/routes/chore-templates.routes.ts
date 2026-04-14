import { Router } from 'express'
import * as templatesController from '../controllers/chore-templates.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, createChoreTemplateSchema, updateChoreTemplateSchema, idParamSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @swagger
 * /chore-templates:
 *   get:
 *     tags: [Chore Templates]
 *     summary: Get all chore templates
 *     description: Retrieve all available chore templates
 *     operationId: getTemplates
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of chore templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChoreTemplate'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, asyncHandler(templatesController.getTemplates))

/**
 * @swagger
 * /chore-templates/{id}:
 *   get:
 *     tags: [Chore Templates]
 *     summary: Get chore template by ID
 *     description: Retrieve a specific chore template
 *     operationId: getTemplate
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chore template data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreTemplate'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(templatesController.getTemplate))

/**
 * @swagger
 * /chore-templates:
 *   post:
 *     tags: [Chore Templates]
 *     summary: Create a chore template
 *     description: Create a new chore template (Parent-only)
 *     operationId: createTemplate
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChoreTemplateRequest'
 *     responses:
 *       200:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreTemplate'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post('/', authenticate, requireParent, validate(createChoreTemplateSchema), asyncHandler(templatesController.createTemplate))

/**
 * @swagger
 * /chore-templates/{id}:
 *   put:
 *     tags: [Chore Templates]
 *     summary: Update a chore template
 *     description: Update an existing chore template (Parent-only)
 *     operationId: updateTemplate
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateChoreTemplateRequest'
 *     responses:
 *       200:
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreTemplate'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), validate(updateChoreTemplateSchema), asyncHandler(templatesController.updateTemplate))

/**
 * @swagger
 * /chore-templates/{id}:
 *   delete:
 *     tags: [Chore Templates]
 *     summary: Delete a chore template
 *     description: Delete a chore template (Parent-only)
 *     operationId: deleteTemplate
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(templatesController.deleteTemplate))

export default router