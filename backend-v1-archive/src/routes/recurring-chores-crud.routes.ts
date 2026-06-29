import { Router } from 'express'
import * as recurringChoresCrudController from '../controllers/recurring-chores-crud.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, idParamSchema, toggleActiveSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @swagger
 * /recurring-chores:
 *   post:
 *     tags: [Recurring Chores]
 *     summary: Create a recurring chore
 *     description: Create a new recurring chore with flexible assignment modes (Parent-only)
 *     operationId: createRecurringChore
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecurringChoreRequest'
 *     responses:
 *       200:
 *         description: Recurring chore created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RecurringChore'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post('/', authenticate, requireParent, asyncHandler(recurringChoresCrudController.createRecurringChore))

/**
 * @swagger
 * /recurring-chores:
 *   get:
 *     tags: [Recurring Chores]
 *     summary: List all recurring chores
 *     description: Retrieve all recurring chores for the family
 *     operationId: listRecurringChores
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of recurring chores
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
 *                     $ref: '#/components/schemas/RecurringChore'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, asyncHandler(recurringChoresCrudController.listRecurringChores))

/**
 * @swagger
 * /recurring-chores/{id}:
 *   get:
 *     tags: [Recurring Chores]
 *     summary: Get recurring chore by ID
 *     description: Retrieve a specific recurring chore
 *     operationId: getRecurringChore
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
 *         description: Recurring chore data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RecurringChore'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recurring chore not found
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresCrudController.getRecurringChore))

/**
 * @swagger
 * /recurring-chores/{id}:
 *   put:
 *     tags: [Recurring Chores]
 *     summary: Update a recurring chore
 *     description: Update a recurring chore definition (affects all future occurrences) (Parent-only)
 *     operationId: updateRecurringChore
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
 *             $ref: '#/components/schemas/UpdateRecurringChoreRequest'
 *     responses:
 *       200:
 *         description: Recurring chore updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RecurringChore'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(recurringChoresCrudController.updateRecurringChore))

/**
 * @swagger
 * /recurring-chores/{id}:
 *   delete:
 *     tags: [Recurring Chores]
 *     summary: Delete a recurring chore
 *     description: Soft delete a recurring chore (sets isActive=false) (Parent-only)
 *     operationId: deleteRecurringChore
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
 *         description: Recurring chore deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(recurringChoresCrudController.deleteRecurringChore))

/**
 * @swagger
 * /recurring-chores/{id}/toggle-active:
 *   patch:
 *     tags: [Recurring Chores]
 *     summary: Toggle recurring chore active status
 *     description: Enable or disable a recurring chore (Parent-only)
 *     operationId: toggleRecurringChoreActive
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
 *             $ref: '#/components/schemas/ToggleActiveRequest'
 *     responses:
 *       200:
 *         description: Active status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.patch('/:id/toggle-active', authenticate, requireParent, validate(idParamSchema, 'params'), validate(toggleActiveSchema, 'body'), asyncHandler(recurringChoresCrudController.toggleRecurringChoreActive))

export default router
