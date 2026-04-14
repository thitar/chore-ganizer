import { Router } from 'express'
import * as categoriesController from '../controllers/chore-categories.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, createChoreCategorySchema, updateChoreCategorySchema, idParamSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @swagger
 * /chore-categories:
 *   get:
 *     tags: [Chore Categories]
 *     summary: Get all chore categories
 *     description: Retrieve all available chore categories
 *     operationId: getCategories
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of chore categories
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
 *                     $ref: '#/components/schemas/ChoreCategory'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, asyncHandler(categoriesController.getCategories))

/**
 * @swagger
 * /chore-categories/{id}:
 *   get:
 *     tags: [Chore Categories]
 *     summary: Get chore category by ID
 *     description: Retrieve a specific chore category
 *     operationId: getCategory
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
 *         description: Chore category data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreCategory'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(categoriesController.getCategory))

/**
 * @swagger
 * /chore-categories/{id}/templates:
 *   get:
 *     tags: [Chore Categories]
 *     summary: Get templates by category
 *     description: Retrieve all chore templates in a specific category
 *     operationId: getCategoryTemplates
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
 *         description: Category templates
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
 *       404:
 *         description: Category not found
 */
router.get('/:id/templates', authenticate, validate(idParamSchema, 'params'), asyncHandler(categoriesController.getCategoryTemplates))

/**
 * @swagger
 * /chore-categories:
 *   post:
 *     tags: [Chore Categories]
 *     summary: Create a chore category
 *     description: Create a new chore category (Parent-only)
 *     operationId: createCategory
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChoreCategoryRequest'
 *     responses:
 *       200:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreCategory'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post('/', authenticate, requireParent, validate(createChoreCategorySchema), asyncHandler(categoriesController.createCategory))

/**
 * @swagger
 * /chore-categories/{id}:
 *   put:
 *     tags: [Chore Categories]
 *     summary: Update a chore category
 *     description: Update an existing chore category (Parent-only)
 *     operationId: updateCategory
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
 *             $ref: '#/components/schemas/UpdateChoreCategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreCategory'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), validate(updateChoreCategorySchema), asyncHandler(categoriesController.updateCategory))

/**
 * @swagger
 * /chore-categories/{id}:
 *   delete:
 *     tags: [Chore Categories]
 *     summary: Delete a chore category
 *     description: Delete a chore category (Parent-only)
 *     operationId: deleteCategory
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
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(categoriesController.deleteCategory))

export default router
