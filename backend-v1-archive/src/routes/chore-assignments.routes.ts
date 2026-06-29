import { Router } from 'express'
import * as assignmentsController from '../controllers/chore-assignments.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'
import { validate, createChoreAssignmentSchema, updateChoreAssignmentSchema, idParamSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @swagger
 * /chore-assignments:
 *   get:
 *     tags: [Chore Assignments]
 *     summary: Get all chore assignments
 *     description: Retrieve all chore assignments with optional filters
 *     operationId: getAssignments
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of chore assignments
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
 *                     $ref: '#/components/schemas/ChoreAssignment'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, asyncHandler(assignmentsController.getAssignments))

/**
 * @swagger
 * /chore-assignments/upcoming:
 *   get:
 *     tags: [Chore Assignments]
 *     summary: Get upcoming assignments
 *     description: Get chore assignments due in the next N days
 *     operationId: getUpcoming
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Upcoming assignments
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
 *                     $ref: '#/components/schemas/ChoreAssignment'
 *       401:
 *         description: Unauthorized
 */
router.get('/upcoming', authenticate, asyncHandler(assignmentsController.getUpcoming))

/**
 * @swagger
 * /chore-assignments/overdue:
 *   get:
 *     tags: [Chore Assignments]
 *     summary: Get overdue assignments
 *     description: Retrieve all overdue chore assignments
 *     operationId: getOverdue
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Overdue assignments
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
 *                     $ref: '#/components/schemas/ChoreAssignment'
 *       401:
 *         description: Unauthorized
 */
router.get('/overdue', authenticate, asyncHandler(assignmentsController.getOverdue))

/**
 * @swagger
 * /chore-assignments/calendar:
 *   get:
 *     tags: [Chore Assignments]
 *     summary: Get calendar view of assignments
 *     description: Retrieve assignments for a month organized by date (for calendar view)
 *     operationId: getCalendar
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Calendar data with assignments
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
 */
router.get('/calendar', authenticate, asyncHandler(assignmentsController.getCalendar))

/**
 * @swagger
 * /chore-assignments/{id}:
 *   get:
 *     tags: [Chore Assignments]
 *     summary: Get chore assignment by ID
 *     description: Retrieve a specific chore assignment
 *     operationId: getAssignment
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
 *         description: Chore assignment data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreAssignment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), asyncHandler(assignmentsController.getAssignment))

/**
 * @swagger
 * /chore-assignments:
 *   post:
 *     tags: [Chore Assignments]
 *     summary: Create a chore assignment
 *     description: Create a new chore assignment (Parent-only)
 *     operationId: createAssignment
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChoreAssignmentRequest'
 *     responses:
 *       200:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreAssignment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post('/', authenticate, requireParent, validate(createChoreAssignmentSchema), asyncHandler(assignmentsController.createAssignment))

/**
 * @swagger
 * /chore-assignments/{id}:
 *   put:
 *     tags: [Chore Assignments]
 *     summary: Update a chore assignment
 *     description: Update an existing chore assignment (reschedule or reassign) (Parent-only)
 *     operationId: updateAssignment
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
 *             $ref: '#/components/schemas/UpdateChoreAssignmentRequest'
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChoreAssignment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), validate(updateChoreAssignmentSchema), asyncHandler(assignmentsController.updateAssignment))

/**
 * @swagger
 * /chore-assignments/{id}/complete:
 *   post:
 *     tags: [Chore Assignments]
 *     summary: Complete a chore assignment
 *     description: Mark a chore assignment as complete and award points to the user
 *     operationId: completeAssignment
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
 *         description: Assignment completed successfully
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
 *       404:
 *         description: Assignment not found
 */
router.post('/:id/complete', authenticate, validate(idParamSchema, 'params'), asyncHandler(assignmentsController.completeAssignment))

/**
 * @swagger
 * /chore-assignments/{id}:
 *   delete:
 *     tags: [Chore Assignments]
 *     summary: Delete a chore assignment
 *     description: Delete a chore assignment (Parent-only)
 *     operationId: deleteAssignment
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
 *         description: Assignment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.delete('/:id', authenticate, requireParent, validate(idParamSchema, 'params'), asyncHandler(assignmentsController.deleteAssignment))

export default router