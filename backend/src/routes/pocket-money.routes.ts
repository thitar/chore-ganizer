import { Router } from 'express'
import * as pocketMoneyController from '../controllers/pocket-money.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireParent } from '../middleware/auth.js'

const router = Router()

/**
 * @route   GET /api/pocket-money/config
 * @desc    Get family's pocket money configuration
 * @access  Private
 */
router.get(
  '/config',
  authenticate,
  asyncHandler(pocketMoneyController.getConfig)
)

/**
 * @route   PUT /api/pocket-money/config
 * @desc    Update family's pocket money configuration
 * @access  Private (Parents only)
 */
router.put(
  '/config',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.updateConfig)
)

/**
 * @route   GET /api/pocket-money/balance/:userId
 * @desc    Get current point balance for a user
 * @access  Private (User or Parent)
 */
router.get(
  '/balance/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.getPointBalance)
)

/**
 * @route   GET /api/pocket-money/transactions/:userId
 * @desc    Get transaction history for a user
 * @access  Private (User or Parent)
 */
router.get(
  '/transactions/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.getTransactionHistory)
)

/**
 * @route   POST /api/pocket-money/bonus
 * @desc    Add bonus points to a user
 * @access  Private (Parents only)
 */
router.post(
  '/bonus',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.addBonus)
)

/**
 * @route   POST /api/pocket-money/deduction
 * @desc    Deduct points from a user
 * @access  Private (Parents only)
 */
router.post(
  '/deduction',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.addDeduction)
)

/**
 * @route   GET /api/pocket-money/payouts/:userId
 * @desc    Get payout history for a user
 * @access  Private (User or Parent)
 */
router.get(
  '/payouts/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.getPayouts)
)

/**
 * @route   POST /api/pocket-money/payout
 * @desc    Mark points as paid out
 * @access  Private (Parents only)
 */
router.post(
  '/payout',
  authenticate,
  requireParent,
  asyncHandler(pocketMoneyController.createPayout)
)

/**
 * @route   GET /api/pocket-money/projected/:userId
 * @desc    Calculate projected earnings for a user
 * @access  Private (User or Parent)
 */
router.get(
  '/projected/:userId',
  authenticate,
  asyncHandler(pocketMoneyController.calculateProjectedEarnings)
)

export default router
