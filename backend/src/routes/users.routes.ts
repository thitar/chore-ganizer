import { Router } from 'express'
import * as usersController from '../controllers/users.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, authorize, requireParent } from '../middleware/auth.js'
import { validate, updateUserSchema, updateMyProfileSchema, idParamSchema, createUserSchema } from '../middleware/validator.js'

const router = Router()

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     description: Retrieve all users in the family. Children can see all family members.
 *     operationId: getAllUsers
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of users
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
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  asyncHandler(usersController.getAllUsers)
)

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Create a new user account (Parent-only)
 *     operationId: createUser
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/',
  authenticate,
  requireParent,
  validate(createUserSchema),
  asyncHandler(usersController.createUser)
)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieve a specific user's details (Parent-only)
 *     operationId: getUserById
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
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/:id',
  authenticate,
  authorize('PARENT'),
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.getUserById)
)

/**
 * @swagger
 * /users/{id}/assignments:
 *   get:
 *     tags: [Users]
 *     summary: Get user assignments
 *     description: Retrieve all chore assignments for a specific user
 *     operationId: getUserAssignments
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
 *         description: User's chore assignments
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
router.get(
  '/:id/assignments',
  authenticate,
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.getUserAssignments)
)

/**
 * @swagger
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update my profile
 *     description: Update the current user's profile (name and color only)
 *     operationId: updateMyProfile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMyProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/me',
  authenticate,
  validate(updateMyProfileSchema),
  asyncHandler(usersController.updateMyProfile)
)

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     description: Update a user's details (Parent-only)
 *     operationId: updateUser
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
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put(
  '/:id',
  authenticate,
  requireParent,
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  asyncHandler(usersController.updateUser)
)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
 *     description: Delete a user account (Parent-only)
 *     operationId: deleteUser
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
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.delete(
  '/:id',
  authenticate,
  requireParent,
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.deleteUser)
)

/**
 * @swagger
 * /users/{id}/lock:
 *   post:
 *     tags: [Users]
 *     summary: Lock a user account
 *     description: Lock a user account to prevent login (Parent-only)
 *     operationId: lockUser
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
 *         description: Account locked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/:id/lock',
  authenticate,
  requireParent,
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.lockUser)
)

/**
 * @swagger
 * /users/{id}/unlock:
 *   post:
 *     tags: [Users]
 *     summary: Unlock a user account
 *     description: Unlock a user account to allow login (Parent-only)
 *     operationId: unlockUser
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
 *         description: Account unlocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/:id/unlock',
  authenticate,
  requireParent,
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.unlockUser)
)

export default router
