import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export async function getMyPoints(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, color: true, role: true },
  })
  if (!user) throw new AppError('User not found', 404)

  const [aggregate, logs] = await Promise.all([
    prisma.pointLog.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.pointLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  return {
    user,
    balance: aggregate._sum.amount ?? 0,
    logs,
  }
}

export async function getUserPoints(
  targetUserId: number,
  requestingUserId: number,
  requestingUserRole: string
) {
  if (requestingUserRole === 'CHILD' && targetUserId !== requestingUserId) {
    throw new AppError('You can only view your own points', 403)
  }
  return getMyPoints(targetUserId)
}

export async function adjustPoints(userId: number, amount: number, reason: string) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new AppError('Amount must be a non-zero integer', 400)
  }
  if (!reason || reason.trim().length === 0) {
    throw new AppError('Reason is required', 400)
  }
  if (reason.length > 200) {
    throw new AppError('Reason must be 200 characters or fewer', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) throw new AppError('User not found', 404)

  return prisma.pointLog.create({
    data: {
      userId,
      amount,
      type: 'ADJUSTMENT',
      reason: reason.trim(),
    },
  })
}

export async function getLeaderboard() {
  const [users, sums] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CHILD' },
      select: { id: true, name: true, color: true, role: true },
    }),
    prisma.pointLog.groupBy({
      by: ['userId'],
      _sum: { amount: true },
    }),
  ])
  const balanceByUser = new Map(sums.map(s => [s.userId, s._sum.amount ?? 0]))
  return users
    .map(user => ({ user, balance: balanceByUser.get(user.id) ?? 0 }))
    .sort((a, b) => b.balance - a.balance)
}
