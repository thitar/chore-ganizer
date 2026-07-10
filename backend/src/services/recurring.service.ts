import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { awardBadges } from './gamification.service'

function toUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function eachDateInRange(from: Date, to: Date): Date[] {
  const dates: Date[] = []
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    dates.push(new Date(d))
  }
  return dates
}

function computeOccurrenceDates(
  chore: { frequency: string; dayOfWeek: number | null; dayOfMonth: number | null },
  from: Date,
  to: Date
): Date[] {
  const allDates = eachDateInRange(from, to)
  if (chore.frequency === 'DAILY') return allDates
  if (chore.frequency === 'WEEKLY' && chore.dayOfWeek !== null) {
    return allDates.filter((d) => d.getUTCDay() === chore.dayOfWeek)
  }
  if (chore.frequency === 'MONTHLY' && chore.dayOfMonth !== null) {
    const target = chore.dayOfMonth
    return allDates.filter((d) => {
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
      const clamped = Math.min(target, lastDay)
      return d.getUTCDate() === clamped
    })
  }
  return []
}

export async function create(data: {
  choreTemplateId: number
  assignedToId: number
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  createdById: number
}) {
  const template = await prisma.choreTemplate.findUnique({ where: { id: data.choreTemplateId } })
  if (!template) throw new AppError('Template not found', 404)

  return prisma.recurringChore.create({
    data: {
      choreTemplateId: data.choreTemplateId,
      assignedToId: data.assignedToId,
      frequency: data.frequency,
      dayOfWeek: data.dayOfWeek ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
      createdById: data.createdById,
    },
    include: {
      template: { select: { id: true, title: true, points: true, category: true } },
      assignedTo: { select: { id: true, name: true, color: true } },
    },
  })
}

export async function getAll() {
  return prisma.recurringChore.findMany({
    include: {
      template: { select: { id: true, title: true, points: true, category: true } },
      assignedTo: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function generateOccurrences(from: Date, to: Date): Promise<void> {
  const chores = await prisma.recurringChore.findMany()
  if (chores.length === 0) return

  for (const chore of chores) {
    const expectedDates = computeOccurrenceDates(chore, from, to)
    if (expectedDates.length === 0) continue

    const existing = await prisma.recurringOccurrence.findMany({
      where: {
        recurringChoreId: chore.id,
        dueDate: { in: expectedDates },
      },
      select: { dueDate: true },
    })
    const existingDateSet = new Set(existing.map((e) => toUtcDate(e.dueDate)))
    const missingDates = expectedDates.filter((d) => !existingDateSet.has(toUtcDate(d)))

    if (missingDates.length === 0) continue

    await prisma.recurringOccurrence.createMany({
      data: missingDates.map((dueDate) => ({
        recurringChoreId: chore.id,
        assignedToId: chore.assignedToId,
        dueDate,
        status: 'PENDING',
      })),
    })
  }
}

export async function completeOccurrence(occurrenceId: number, userId: number) {
  const occurrence = await prisma.recurringOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { chore: { include: { template: true } } },
  })
  if (!occurrence) throw new AppError('Occurrence not found', 404)
  if (occurrence.assignedToId !== userId) {
    throw new AppError('You can only complete your own occurrences', 403)
  }
  if (occurrence.status === 'COMPLETED') {
    throw new AppError('Occurrence is already completed', 409)
  }

  if (!occurrence.chore) {
    throw new AppError('Recurring chore not found', 404)
  }
  const pointsAwarded = occurrence.chore.template.points
  const reason = occurrence.chore.template.title

  const result = await prisma.$transaction(async (tx) => {
    await tx.recurringOccurrence.update({
      where: { id: occurrenceId },
      data: { status: 'COMPLETED', completedAt: new Date(), pointsAwarded },
    })
    await tx.pointLog.create({
      data: {
        userId: occurrence.assignedToId,
        amount: pointsAwarded,
        type: 'EARNED',
        reason,
      },
    })
    if (pointsAwarded > 0) {
      await tx.user.update({
        where: { id: occurrence.assignedToId },
        data: { lifetimePoints: { increment: pointsAwarded } },
      })
    }
    return tx.recurringOccurrence.findUnique({
      where: { id: occurrenceId },
      include: {
        chore: {
          include: {
            template: { select: { id: true, title: true, points: true, category: true } },
          },
        },
        assignedTo: { select: { id: true, name: true, color: true } },
      },
    })
  })
  void awardBadges(occurrence.assignedToId)
  return result
}

export async function delete_(id: number) {
  const chore = await prisma.recurringChore.findUnique({ where: { id } })
  if (!chore) throw new AppError('Recurring chore not found', 404)

  await prisma.$transaction([
    prisma.recurringOccurrence.deleteMany({
      where: { recurringChoreId: id, status: 'PENDING' },
    }),
    prisma.recurringChore.delete({ where: { id } }),
  ])
  return { deleted: true }
}
