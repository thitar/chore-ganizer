import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import bcrypt from 'bcrypt'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

export async function getAll() {
  return prisma.user.findMany({
    select: { id: true, name: true, role: true, color: true },
    orderBy: { name: 'asc' },
  })
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: string
  color: string
}) {
  if (!data.name || data.name.length === 0 || data.name.length > 50) {
    throw new AppError('Name must be 1-50 characters', 400)
  }
  if (!EMAIL_REGEX.test(data.email)) {
    throw new AppError('Invalid email format', 400)
  }
  if (data.password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400)
  }
  if (data.role !== 'PARENT' && data.role !== 'CHILD') {
    throw new AppError('Role must be PARENT or CHILD', 400)
  }
  if (!HEX_REGEX.test(data.color)) {
    throw new AppError('Color must be a valid hex code (#RRGGBB)', 400)
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new AppError('Email already in use', 409)
  }

  const hashed = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      color: data.color,
    },
    select: { id: true, name: true, email: true, role: true, color: true },
  })
}

export async function deleteUser(id: number, requestingUserId: number) {
  if (id === requestingUserId) {
    throw new AppError('Cannot delete yourself', 400)
  }
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new AppError('User not found', 404)

  const [assignmentCount, pointLogCount, recurringChoreCount, createdRecurringCount] = await Promise.all([
    prisma.choreAssignment.count({ where: { assignedToId: id } }),
    prisma.pointLog.count({ where: { userId: id } }),
    prisma.recurringChore.count({ where: { assignedToId: id } }),
    prisma.recurringChore.count({ where: { createdById: id } }),
  ])

  const total =
    assignmentCount + pointLogCount + recurringChoreCount + createdRecurringCount
  if (total > 0) {
    const parts: string[] = []
    if (assignmentCount > 0) parts.push(`${assignmentCount} assignment${assignmentCount === 1 ? '' : 's'}`)
    if (pointLogCount > 0) parts.push(`${pointLogCount} point log${pointLogCount === 1 ? '' : 's'}`)
    if (recurringChoreCount > 0) parts.push(`${recurringChoreCount} recurring chore${recurringChoreCount === 1 ? '' : 's'}`)
    if (createdRecurringCount > 0) parts.push(`${createdRecurringCount} created recurring chore${createdRecurringCount === 1 ? '' : 's'}`)
    throw new AppError(
      `Cannot delete user with existing data (${parts.join(', ')}). Reassign or uncomplete them first.`,
      409
    )
  }

  await prisma.user.delete({ where: { id } })
  return { deleted: true }
}

export async function updatePassword(userId: number, currentPassword: string, newPassword: string) {
  if (!currentPassword) {
    throw new AppError('Current password is required', 400)
  }
  if (!newPassword || newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400)
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('User not found', 404)

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new AppError('Current password is incorrect', 401)

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  })
  return { updated: true }
}

export async function updateColor(userId: number, color: string) {
  if (!HEX_REGEX.test(color)) {
    throw new AppError('Color must be a valid hex code (#RRGGBB)', 400)
  }
  return prisma.user.update({
    where: { id: userId },
    data: { color },
    select: { id: true, name: true, email: true, role: true, color: true },
  })
}
