import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { getOverdueConfig } from './notification.service'
import { localTime } from './overdue.notification.service'

const ASSIGN_INCLUDE = {
  template: { select: { id: true, title: true, points: true, category: true } },
  assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
} as const

const OCCURRENCE_INCLUDE = {
  chore: {
    include: {
      template: { select: { id: true, title: true, points: true, category: true } },
    },
  },
  assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
} as const

function startOfTodayInTz(now: Date, timezone: string): Date {
  const { hour, minute } = localTime(now, timezone)
  return new Date(
    now.getTime() - ((hour * 60 + minute) * 60 + now.getUTCSeconds()) * 1000 - now.getUTCMilliseconds()
  )
}

export async function listOverdue(now = new Date()) {
  const before = startOfTodayInTz(now, getOverdueConfig().timezone)
  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: { status: 'PENDING', dueDate: { lt: before } },
      include: ASSIGN_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.recurringOccurrence.findMany({
      where: { status: 'PENDING', dueDate: { lt: before } },
      include: OCCURRENCE_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const regular = assignments.map((a) => ({
    id: a.id,
    type: 'REGULAR' as const,
    choreTemplateId: a.choreTemplateId,
    assignedToId: a.assignedToId,
    dueDate: a.dueDate.toISOString().split('T')[0],
    status: a.status,
    completedAt: a.completedAt?.toISOString() ?? null,
    pointsAwarded: a.pointsAwarded,
    dueNotifiedAt: a.dueNotifiedAt?.toISOString() ?? null,
    overdueNotifiedAt: a.overdueNotifiedAt?.toISOString() ?? null,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    template: a.template,
    assignedTo: a.assignedTo,
  }))

  const recurring = occurrences
    .filter((o) => o.chore !== null)
    .map((o) => ({
      id: o.id,
      type: 'RECURRING' as const,
      choreTemplateId: o.chore!.choreTemplateId,
      assignedToId: o.assignedToId,
      dueDate: o.dueDate.toISOString().split('T')[0],
      status: o.status,
      completedAt: o.completedAt?.toISOString() ?? null,
      pointsAwarded: o.pointsAwarded,
      dueNotifiedAt: o.dueNotifiedAt?.toISOString() ?? null,
      overdueNotifiedAt: o.overdueNotifiedAt?.toISOString() ?? null,
      notes: null,
      createdAt: o.createdAt.toISOString(),
      template: o.chore!.template,
      assignedTo: o.assignedTo,
    }))

  return [...regular, ...recurring].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

type CancelInput = { id: number; type: 'REGULAR' | 'RECURRING'; penalty?: number }

export async function cancel(data: CancelInput) {
  const penalty = data.penalty ?? 0
  if (!Number.isInteger(penalty) || penalty < 0) {
    throw new AppError('Penalty must be a non-negative integer', 400)
  }
  if (data.type === 'REGULAR') return cancelAssignment(data.id, penalty)
  return cancelOccurrence(data.id, penalty)
}

async function cancelAssignment(id: number, penalty: number) {
  const row = await prisma.choreAssignment.findUnique({
    where: { id },
    include: { template: { select: { id: true, title: true, points: true } } },
  })
  if (!row) throw new AppError('Assignment not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be cancelled', 409)

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.choreAssignment.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        penaltyPoints: penalty > 0 ? penalty : null,
      },
    })
    if (count === 0) throw new AppError('Only pending chores can be cancelled', 409)
    if (penalty > 0) {
      await tx.pointLog.create({
        data: {
          userId: row.assignedToId,
          amount: -penalty,
          type: 'PENALTY',
          reason: `Overdue: ${row.template.title}`,
        },
      })
    }
    return tx.choreAssignment.findUnique({ where: { id }, include: ASSIGN_INCLUDE })
  })
}

async function cancelOccurrence(id: number, penalty: number) {
  const row = await prisma.recurringOccurrence.findUnique({
    where: { id },
    include: { chore: { include: { template: { select: { id: true, title: true, points: true } } } } },
  })
  if (!row) throw new AppError('Occurrence not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be cancelled', 409)

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.recurringOccurrence.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        penaltyPoints: penalty > 0 ? penalty : null,
      },
    })
    if (count === 0) throw new AppError('Only pending chores can be cancelled', 409)
    if (penalty > 0) {
      await tx.pointLog.create({
        data: {
          userId: row.assignedToId,
          amount: -penalty,
          type: 'PENALTY',
          reason: `Overdue: ${row.chore?.template.title ?? 'Unknown'}`,
        },
      })
    }
    return tx.recurringOccurrence.findUnique({ where: { id }, include: OCCURRENCE_INCLUDE })
  })
}

export async function reschedule(data: { id: number; type: 'REGULAR' | 'RECURRING'; dueDate: string }) {
  if (data.type !== 'REGULAR') throw new AppError('Only regular chores can be rescheduled', 400)

  const row = await prisma.choreAssignment.findUnique({ where: { id: data.id } })
  if (!row) throw new AppError('Assignment not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be rescheduled', 409)

  const { count } = await prisma.choreAssignment.updateMany({
    where: { id: data.id, status: 'PENDING' },
    data: {
      dueDate: new Date(data.dueDate),
      dueNotifiedAt: null,
      overdueNotifiedAt: null,
    },
  })
  if (count === 0) throw new AppError('Only pending chores can be rescheduled', 409)

  return prisma.choreAssignment.findUnique({ where: { id: data.id } })
}
