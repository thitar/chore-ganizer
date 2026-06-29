import { Router } from 'express'
import * as recurringChoresOccurrencesController from '../controllers/recurring-chores-occurrences.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, idParamSchema } from '../middleware/validator.js'

const router = Router()

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
router.get('/occurrences', authenticate, asyncHandler(recurringChoresOccurrencesController.listOccurrences))

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
router.patch('/occurrences/:id/complete', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresOccurrencesController.completeOccurrence))

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
router.patch('/occurrences/:id/skip', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresOccurrencesController.skipOccurrence))

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
router.patch('/occurrences/:id/unskip', authenticate, validate(idParamSchema, 'params'), asyncHandler(recurringChoresOccurrencesController.unskipOccurrence))

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
router.post('/trigger-occurrences', authenticate, requireParent, asyncHandler(recurringChoresOccurrencesController.triggerOccurrenceGeneration))

export default router
