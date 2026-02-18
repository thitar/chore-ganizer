import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'

// Type definitions for request bodies
interface UpdateConfigBody {
  pointValue?: number
  currency?: string
  payoutPeriod?: string
  payoutDay?: number
  allowAdvance?: boolean
  maxAdvancePoints?: number
}

interface AddBonusBody {
  userId: number
  amount: number
  description?: string
}

interface AddDeductionBody {
  userId: number
  amount: number
  description?: string
}

interface CreatePayoutBody {
  userId: number
  points: number
  periodStart: string
  periodEnd: string
}

interface TransactionQueryParams {
  page?: string
  limit?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}

// Transaction type constants
const TransactionTypes = {
  EARNED: 'EARNED',
  BONUS: 'BONUS',
  DEDUCTION: 'DEDUCTION',
  PENALTY: 'PENALTY',
  PAYOUT: 'PAYOUT',
  ADVANCE: 'ADVANCE',
  ADJUSTMENT: 'ADJUSTMENT',
} as const

// Payout status constants
const PayoutStatuses = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const

/**
 * Helper function to create a point transaction
 */
async function createTransaction(
  userId: number,
  type: string,
  amount: number,
  options?: {
    description?: string
    choreAssignmentId?: number
    relatedUserId?: number
  }
) {
  return prisma.pointTransaction.create({
    data: {
      userId,
      type,
      amount,
      description: options?.description,
      choreAssignmentId: options?.choreAssignmentId,
      relatedUserId: options?.relatedUserId,
    },
  })
}

/**
 * Helper function to calculate point balance
 * Balance = Sum of all EARNED + BONUS - DEDUCTION - PENALTY - PAYOUT - ADVANCE - ADJUSTMENT
 */
async function calculatePointBalance(userId: number): Promise<{ totalPoints: number; monetaryValue: number }> {
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId },
  })

  let totalPoints = 0
  for (const tx of transactions) {
    switch (tx.type) {
      case 'EARNED':
      case 'BONUS':
        totalPoints += tx.amount
        break
      case 'DEDUCTION':
      case 'PENALTY':
      case 'PAYOUT':
      case 'ADVANCE':
      case 'ADJUSTMENT':
        totalPoints -= Math.abs(tx.amount)
        break
    }
  }

  // Get family's point value
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { family: { include: { pocketMoneyConfig: true } } },
  })

  const pointValue = user?.family?.pocketMoneyConfig?.pointValue ?? 10
  const monetaryValue = Math.round(totalPoints * (pointValue / 100) * 100) / 100 // Convert to currency

  return { totalPoints, monetaryValue }
}

/**
 * Helper function to get or create pocket money config for a family
 */
async function getOrCreateConfig(familyId: string) {
  let config = await prisma.pocketMoneyConfig.findUnique({
    where: { familyId },
  })

  if (!config) {
    config = await prisma.pocketMoneyConfig.create({
      data: { familyId },
    })
  }

  return config
}

/**
 * Helper function to get start of current payout period
 */
function getPayoutPeriodStart(period: string): Date {
  const now = new Date()
  
  if (period === 'WEEKLY') {
    // Start of current week (Sunday)
    const day = now.getDay()
    const diff = now.getDate() - day
    return new Date(now.setDate(diff))
  } else {
    // Start of current month
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

/**
 * GET /api/pocket-money/config
 * Get family's pocket money configuration
 */
export const getConfig = async (req: Request, res: Response) => {
  const userId = req.user!.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { family: { include: { pocketMoneyConfig: true } } },
  })

  if (!user?.familyId) {
    // Return default config if user has no family
    res.json({
      success: true,
      data: {
        config: {
          pointValue: 10,
          currency: 'EUR',
          payoutPeriod: 'MONTHLY',
          payoutDay: 1,
          allowAdvance: true,
          maxAdvancePoints: 50,
        },
      },
    })
    return
  }

  const config = await getOrCreateConfig(user.familyId)

  res.json({
    success: true,
    data: { config },
  })
}

/**
 * PUT /api/pocket-money/config
 * Update family's pocket money configuration (parents only)
 */
export const updateConfig = async (req: Request, res: Response) => {
  const userId = req.user!.id
  const {
    pointValue,
    currency,
    payoutPeriod,
    payoutDay,
    allowAdvance,
    maxAdvancePoints,
  }: UpdateConfigBody = req.body

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { family: { include: { pocketMoneyConfig: true } } },
  })

  if (!user?.familyId) {
    throw new AppError('User does not belong to a family', 400, 'VALIDATION_ERROR')
  }

  // Validate inputs
  if (pointValue !== undefined && pointValue <= 0) {
    throw new AppError('pointValue must be greater than 0', 400, 'VALIDATION_ERROR')
  }

  if (currency !== undefined && !['EUR', 'USD', 'GBP'].includes(currency)) {
    throw new AppError('Invalid currency. Must be EUR, USD, or GBP', 400, 'VALIDATION_ERROR')
  }

  if (payoutPeriod !== undefined && !['WEEKLY', 'MONTHLY'].includes(payoutPeriod)) {
    throw new AppError('Invalid payoutPeriod. Must be WEEKLY or MONTHLY', 400, 'VALIDATION_ERROR')
  }

  if (payoutDay !== undefined) {
    if (payoutPeriod === 'MONTHLY' && (payoutDay < 1 || payoutDay > 28)) {
      throw new AppError('payoutDay must be between 1 and 28 for monthly period', 400, 'VALIDATION_ERROR')
    }
    if (payoutPeriod === 'WEEKLY' && (payoutDay < 0 || payoutDay > 6)) {
      throw new AppError('payoutDay must be between 0 (Sunday) and 6 (Saturday) for weekly period', 400, 'VALIDATION_ERROR')
    }
  }

  if (maxAdvancePoints !== undefined && maxAdvancePoints < 0) {
    throw new AppError('maxAdvancePoints must be non-negative', 400, 'VALIDATION_ERROR')
  }

  const updateData: UpdateConfigBody = {}
  if (pointValue !== undefined) updateData.pointValue = pointValue
  if (currency !== undefined) updateData.currency = currency
  if (payoutPeriod !== undefined) updateData.payoutPeriod = payoutPeriod
  if (payoutDay !== undefined) updateData.payoutDay = payoutDay
  if (allowAdvance !== undefined) updateData.allowAdvance = allowAdvance
  if (maxAdvancePoints !== undefined) updateData.maxAdvancePoints = maxAdvancePoints

  const config = await prisma.pocketMoneyConfig.upsert({
    where: { familyId: user.familyId },
    update: updateData,
    create: { familyId: user.familyId, ...updateData },
  })

  res.json({
    success: true,
    data: { config },
  })
}

/**
 * GET /api/pocket-money/balance/:userId
 * Get current point balance for a user
 */
export const getPointBalance = async (req: Request, res: Response) => {
  const { userId } = req.params

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)

  // Verify the requesting user has access (they are the target user or a parent)
  const currentUserId = req.user!.id
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  })

  if (currentUserId !== targetUserId && currentUser?.role !== 'PARENT') {
    throw new AppError('Unauthorized to view this user\'s balance', 403, 'FORBIDDEN')
  }

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  })

  if (!targetUser) {
    throw new AppError('User not found', 404, 'NOT_FOUND')
  }

  const { totalPoints, monetaryValue } = await calculatePointBalance(targetUserId)

  // Get the family's pocket money config for currency
  const userWithFamily = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { family: { include: { pocketMoneyConfig: true } } },
  })
  const currency = userWithFamily?.family?.pocketMoneyConfig?.currency || 'EUR'

  res.json({
    success: true,
    data: {
      balance: {
        points: totalPoints,
        monetaryValue,
        currency,
      },
    },
  })
}

/**
 * GET /api/pocket-money/transactions/:userId
 * Get transaction history for a user
 */
export const getTransactionHistory = async (req: Request, res: Response) => {
  const { userId } = req.params
  const { page = '1', limit = '20', type, dateFrom, dateTo }: TransactionQueryParams = req.query

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)

  // Verify the requesting user has access
  const currentUserId = req.user!.id
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  })

  if (currentUserId !== targetUserId && currentUser?.role !== 'PARENT') {
    throw new AppError('Unauthorized to view this user\'s transactions', 403, 'FORBIDDEN')
  }

  // Build filters
  const where: any = { userId: targetUserId }

  if (type && ['EARNED', 'BONUS', 'DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE', 'ADJUSTMENT'].includes(type)) {
    where.type = type
  }

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo)
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const skip = (pageNum - 1) * limitNum

  const [transactions, total] = await Promise.all([
    prisma.pointTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        relatedUser: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.pointTransaction.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  })
}

/**
 * POST /api/pocket-money/bonus
 * Add bonus points to a user (parents only)
 */
export const addBonus = async (req: Request, res: Response) => {
  const { userId, amount, description }: AddBonusBody = req.body

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  if (!amount || amount <= 0) {
    throw new AppError('Amount must be a positive number', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)
  const parentUserId = req.user!.id

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  })

  if (!targetUser) {
    throw new AppError('Target user not found', 404, 'NOT_FOUND')
  }

  // Create the bonus transaction
  const transaction = await createTransaction(
    targetUserId,
    TransactionTypes.BONUS,
    amount,
    {
      description: description || 'Bonus points awarded',
      relatedUserId: parentUserId,
    }
  )

  res.status(201).json({
    success: true,
    data: { transaction },
  })
}

/**
 * POST /api/pocket-money/deduction
 * Deduct points from a user (parents only)
 */
export const addDeduction = async (req: Request, res: Response) => {
  const { userId, amount, description }: AddDeductionBody = req.body

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  if (!amount || amount <= 0) {
    throw new AppError('Amount must be a positive number', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)
  const parentUserId = req.user!.id

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  })

  if (!targetUser) {
    throw new AppError('Target user not found', 404, 'NOT_FOUND')
  }

  // Check if user has enough points
  const { totalPoints } = await calculatePointBalance(targetUserId)
  if (totalPoints < amount) {
    throw new AppError('Insufficient points for deduction', 400, 'VALIDATION_ERROR')
  }

  // Create the deduction transaction (stored as negative)
  const transaction = await createTransaction(
    targetUserId,
    TransactionTypes.DEDUCTION,
    -amount,
    {
      description: description || 'Points deducted',
      relatedUserId: parentUserId,
    }
  )

  res.status(201).json({
    success: true,
    data: { transaction },
  })
}

/**
 * GET /api/pocket-money/payouts/:userId
 * Get payout history for a user
 */
export const getPayouts = async (req: Request, res: Response) => {
  const { userId } = req.params
  const { status } = req.query

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)

  // Verify the requesting user has access
  const currentUserId = req.user!.id
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  })

  // Parents can see all children's payouts, children can only see their own
  if (currentUserId !== targetUserId && currentUser?.role !== 'PARENT') {
    throw new AppError('Unauthorized to view this user\'s payouts', 403, 'FORBIDDEN')
  }

  // Build filters
  const where: any = { userId: targetUserId }

  if (status && ['PENDING', 'PAID', 'CANCELLED'].includes(status as string)) {
    where.status = status
  }

  const payouts = await prisma.payout.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: { payouts },
  })
}

/**
 * POST /api/pocket-money/payout
 * Mark points as paid out (parents only)
 */
export const createPayout = async (req: Request, res: Response) => {
  const { userId, points, periodStart, periodEnd }: CreatePayoutBody = req.body

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  if (!points || points <= 0) {
    throw new AppError('Points must be a positive number', 400, 'VALIDATION_ERROR')
  }

  if (!periodStart || !periodEnd) {
    throw new AppError('periodStart and periodEnd are required', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)

  // Verify target user exists and get family's point value
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { family: { include: { pocketMoneyConfig: true } } },
  })

  if (!targetUser) {
    throw new AppError('Target user not found', 404, 'NOT_FOUND')
  }

  // Check if user has enough points
  const { totalPoints } = await calculatePointBalance(targetUserId)
  if (totalPoints < points) {
    throw new AppError('Insufficient points for payout', 400, 'VALIDATION_ERROR')
  }

  // Calculate amount in cents
  const pointValue = targetUser.family?.pocketMoneyConfig?.pointValue ?? 10
  const amount = Math.round(points * pointValue)

  // Create payout record
  const payout = await prisma.payout.create({
    data: {
      userId: targetUserId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      points,
      amount,
      status: PayoutStatuses.PAID,
      paidAt: new Date(),
    },
  })

  // Create payout transaction
  await createTransaction(
    targetUserId,
    TransactionTypes.PAYOUT,
    -points,
    {
      description: `Payout for period ${periodStart} to ${periodEnd}`,
    }
  )

  res.status(201).json({
    success: true,
    data: { payout },
  })
}

/**
 * GET /api/pocket-money/projected/:userId
 * Calculate projected earnings based on:
 * - Current point balance
 * - Points earned in current period
 * - Point value × total points
 */
export const calculateProjectedEarnings = async (req: Request, res: Response) => {
  const { userId } = req.params

  if (!userId || isNaN(Number(userId))) {
    throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
  }

  const targetUserId = Number(userId)

  // Verify the requesting user has access
  const currentUserId = req.user!.id
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  })

  if (currentUserId !== targetUserId && currentUser?.role !== 'PARENT') {
    throw new AppError('Unauthorized to view this user\'s projected earnings', 403, 'FORBIDDEN')
  }

  // Get user's family and config
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { family: { include: { pocketMoneyConfig: true } } },
  })

  if (!targetUser?.familyId) {
    throw new AppError('User does not belong to a family', 400, 'VALIDATION_ERROR')
  }

  const config = await getOrCreateConfig(targetUser.familyId)
  const pointValue = config.pointValue

  // Get current point balance
  const { totalPoints, monetaryValue: currentValue } = await calculatePointBalance(targetUserId)

  // Calculate points earned in current period
  const periodStart = getPayoutPeriodStart(config.payoutPeriod)

  const periodTransactions = await prisma.pointTransaction.findMany({
    where: {
      userId: targetUserId,
      createdAt: { gte: periodStart },
    },
  })

  let periodEarnings = 0
  for (const tx of periodTransactions) {
    if (tx.type === 'EARNED' || tx.type === 'BONUS') {
      periodEarnings += tx.amount
    } else if (['DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE', 'ADJUSTMENT'].includes(tx.type)) {
      periodEarnings -= Math.abs(tx.amount)
    }
  }

  // Calculate projected earnings (total points × point value)
  const projectedAmount = Math.round(totalPoints * (pointValue / 100) * 100) / 100

  res.json({
    success: true,
    data: {
      currentBalance: {
        points: totalPoints,
        value: currentValue,
      },
      currentPeriod: {
        startDate: periodStart.toISOString(),
        earnings: periodEarnings,
      },
      pointValue,
      currency: config.currency,
      projectedEarnings: {
        points: totalPoints,
        amount: projectedAmount,
      },
    },
  })
}
