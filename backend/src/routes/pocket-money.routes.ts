import { Router } from 'express'
import * as pocketMoneyController from '../controllers/pocket-money.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'

const router = Router()

/**
 * @swagger
 * /pocket-money/config:
 *   get:
 *     tags: [Pocket Money]
 *     summary: Get pocket money configuration
 *     description: Retrieve the family's pocket money configuration (points-to-currency conversion rate)
 *     operationId: getConfig
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Pocket money configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PocketMoneyConfig'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/config',
  authenticate,
  asyncHandler(pocketMoneyController.getConfig)
)

/**
 * @swagger
 * /pocket-money/config:
 *   put:
 *     tags: [Pocket Money]
 *     summary: Update pocket money configuration
 *     description: Update the family's pocket money configuration (Parent-only)
 *     operationId: updateConfig
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PocketMoneyConfig'
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PocketMoneyConfig'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.put(
  '/config',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.updateConfig)
)

/**
 * @swagger
 * /pocket-money/balance/{userId}:
 *   get:
 *     tags: [Pocket Money]
 *     summary: Get point balance
 *     description: Get current point balance for a user
 *     operationId: getPointBalance
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current point balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/balance/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.getPointBalance)
)

/**
 * @swagger
 * /pocket-money/transactions/{userId}:
 *   get:
 *     tags: [Pocket Money]
 *     summary: Get transaction history
 *     description: Get point transaction history for a user
 *     operationId: getTransactionHistory
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction history
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
 *                     $ref: '#/components/schemas/PointTransaction'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/transactions/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.getTransactionHistory)
)

/**
 * @swagger
 * /pocket-money/bonus:
 *   post:
 *     tags: [Pocket Money]
 *     summary: Add bonus points
 *     description: Add bonus points to a user's balance (Parent-only)
 *     operationId: addBonus
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddBonusRequest'
 *     responses:
 *       200:
 *         description: Bonus added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/bonus',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.addBonus)
)

/**
 * @swagger
 * /pocket-money/deduction:
 *   post:
 *     tags: [Pocket Money]
 *     summary: Deduct points
 *     description: Deduct points from a user's balance (Parent-only)
 *     operationId: addDeduction
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddDeductionRequest'
 *     responses:
 *       200:
 *         description: Deduction applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/deduction',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.addDeduction)
)

/**
 * @swagger
 * /pocket-money/advance:
 *   post:
 *     tags: [Pocket Money]
 *     summary: Grant advance
 *     description: Grant an advance (negative balance) to a user (Parent-only)
 *     operationId: addAdvance
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddAdvanceRequest'
 *     responses:
 *       200:
 *         description: Advance granted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/advance',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.addAdvance)
)

/**
 * @swagger
 * /pocket-money/payouts/{userId}:
 *   get:
 *     tags: [Pocket Money]
 *     summary: Get payout history
 *     description: Get payout history for a user
 *     operationId: getPayouts
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payout history
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
 *                     $ref: '#/components/schemas/PointTransaction'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/payouts/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.getPayouts)
)

/**
 * @swagger
 * /pocket-money/payout:
 *   post:
 *     tags: [Pocket Money]
 *     summary: Create payout
 *     description: Mark points as paid out to a user (Parent-only)
 *     operationId: createPayout
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayoutRequest'
 *     responses:
 *       200:
 *         description: Payout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (parent-only)
 */
router.post(
  '/payout',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.createPayout)
)

/**
 * @swagger
 * /pocket-money/projected/{userId}:
 *   get:
 *     tags: [Pocket Money]
 *     summary: Calculate projected earnings
 *     description: Calculate projected earnings for a user based on upcoming recurring chores
 *     operationId: calculateProjectedEarnings
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projected earnings calculation
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
 *         description: User not found
 */
router.get(
  '/projected/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.calculateProjectedEarnings)
)

export default router
