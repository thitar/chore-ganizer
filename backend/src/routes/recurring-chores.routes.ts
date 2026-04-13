import { Router } from 'express'
import * as recurringChoresController from '../controllers/recurring-chores.controller.js'
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
router.post('/', authenticate, requireParent, asyncHandler(recurringChoresController.createRecurringChore))

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
router.get('/', authenticate, asyncHandler(recurringChoresController.listRecurringChores))

/**
 * @swagger
 * /recurring-chores/occurrences:
 *   get:
 *     tags: [Recurring Chores]
 *     summary: List upcoming occurrences
 *     description: Retrieve chore occurrences for the next 30 days
 *     operationId: listOccurrences
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of occurrences
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
 *                     $ref: '#/components/schemas/ChoreOccurrence'
 *       401:
 *         description: Unauthorized
 */
router.get('/occurrences', authenticate, asyncHandler(recurringChoresController.listOccurrences))

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
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.getRecurringChore))

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
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.updateRecurringChore))

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
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.deleteRecurringChore))

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
router.patch('/:id/toggle-active', authenticate, requireParent, validate(idParamSchema, 'params'), validate(toggleActiveSchema, 'body'), asyncHandler(recurringChoresController.toggleRecurringChoreActive))

/**
 * @swagger
 * /recurring-chores/occurrences/{id}/complete:
 *   patch:
 *     tags: [Recurring Chores]
 *     summary: Complete an occurrence
 *     description: Mark a chore occurrence as completed and award points
 *     operationId: completeOccurrence
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
 *             $ref: '#/components/schemas/CompleteOccurrenceRequest'
 *     responses:
 *       200:
 *         description: Occurrence completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreOccurrence'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.patch('/occurrences/:id/complete', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.completeOccurrence))

/**
 * @swagger
 * /recurring-chores/occurrences/{id}/skip:
 *   patch:
 *     tags: [Recurring Chores]
 *     summary: Skip an occurrence
 *     description: Skip a chore occurrence without marking it complete
 *     operationId: skipOccurrence
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
 *             $ref: '#/components/schemas/SkipOccurrenceRequest'
 *     responses:
 *       200:
 *         description: Occurrence skipped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreOccurrence'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.patch('/occurrences/:id/skip', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.skipOccurrence))

/**
 * @swagger
 * /recurring-chores/occurrences/{id}/unskip:
 *   patch:
 *     tags: [Recurring Chores]
 *     summary: Unskip an occurrence
 *     description: Mark a previously skipped occurrence as pending again
 *     operationId: unskipOccurrence
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
 *         description: Occurrence unskipped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreOccurrence'
 *       401:
 *         description: Unauthorized
 */
router.patch('/occurrences/:id/unskip', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresController.unskipOccurrence))

/**
 * @swagger
 * /recurring-chores/trigger-occurrences:
 *   post:
 *     tags: [Recurring Chores]
 *     summary: Trigger occurrence generation
 *     description: Manually trigger the generation of recurring chore occurrences (Parent-only, for testing/admin)
 *     operationId: triggerOccurrenceGeneration
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Occurrence generation triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post('/trigger-occurrences', authenticate, requireParent, asyncHandler(recurringChoresController.triggerOccurrenceGeneration))

export default router
