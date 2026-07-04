import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { generateOccurrences } from './recurring.service'
import { sendNtfy } from './notification.service'
import { dueSoonBody } from './notification.formatters'
import { isNtfyConfigured } from '../config/notifications'

export async function create(data: {
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  notes?: string
}) {
  const template = await prisma.choreTemplate.findUnique({ where: { id: data.choreTemplateId } })
  if (!template) throw new AppError('Template not found', 404)

  return prisma.choreAssignment.create({
    data: {
      choreTemplateId: data.choreTemplateId,
      assignedToId: data.assignedToId,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
      status: 'PENDING',
    },
  })
}

export async function getAll(userId: number, role: string, fromStr?: string, toStr?: string) {
  let from: Date
  let to: Date
  if (fromStr && toStr) {
    from = new Date(fromStr)
    to = new Date(toStr)
  } else if (fromStr) {
    from = new Date(fromStr)
    to = new Date(from.getUTCFullYear(), from.getUTCMonth() + 1, 0)
  } else if (toStr) {
    to = new Date(toStr)
    from = new Date(to.getUTCFullYear(), to.getUTCMonth(), 1)
  } else {
    const now = new Date()
    from = new Date(now.getFullYear(), now.getUTCMonth(), 1)
    to = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  }
  await generateOccurrences(from, to)

  const roleFilter = role === 'PARENT' ? {} : { assignedToId: userId }
  const dateFilter = { dueDate: { gte: from, lte: to } }
  const where = { AND: [roleFilter, dateFilter] }
  const occWhere = { AND: [roleFilter, { dueDate: { gte: from, lte: to } }] }

  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({
      where,
      include: {
        template: { select: { id: true, title: true, points: true, category: true } },
        assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.recurringOccurrence.findMany({
      where: occWhere,
      include: {
        chore: {
          include: {
            template: { select: { id: true, title: true, points: true, category: true } },
          },
        },
        assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
      },
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
    notes: a.notes,
    dueNotifiedAt: a.dueNotifiedAt?.toISOString() ?? null,
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
      notes: null,
      createdAt: o.createdAt.toISOString(),
      template: o.chore!.template,
      assignedTo: o.assignedTo,
    }))

  const combined = [...regular, ...recurring].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  void notifyDueSoon(combined)
  return combined
}

export async function update(
  id: number,
  data: { assignedToId?: number; dueDate?: string }
) {
  const updateData: Record<string, unknown> = {}
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate)

  try {
    return await prisma.choreAssignment.update({ where: { id }, data: updateData })
  } catch (err: unknown) {
    if (isRecordNotFoundError(err)) {
      throw new AppError('Assignment not found', 404)
    }
    throw err
  }
}

export async function complete(assignmentId: number, userId: number) {
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: { template: true },
  })
  if (!assignment) throw new AppError('Assignment not found', 404)
  if (assignment.assignedToId !== userId) throw new AppError('You can only complete your own assignments', 403)
  if (assignment.status === 'COMPLETED') throw new AppError('Assignment is already completed', 409)

  const pointsAwarded = assignment.template.points

  const updated = await prisma.$transaction(async (tx) => {
    await tx.choreAssignment.update({
      where: { id: assignmentId },
      data: { status: 'COMPLETED', completedAt: new Date(), pointsAwarded },
    })
    await tx.pointLog.create({
      data: {
        userId: assignment.assignedToId,
        amount: pointsAwarded,
        type: 'EARNED',
        reason: assignment.template.title,
      },
    })
    return tx.choreAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        template: { select: { id: true, title: true, points: true, category: true } },
        assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
      },
    })
  })

  return updated
}

export async function uncomplete(assignmentId: number) {
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: { template: { select: { title: true } } },
  })
  if (!assignment) throw new AppError('Assignment not found', 404)
  if (assignment.status === 'PENDING' || assignment.status !== 'COMPLETED') throw new AppError('Assignment is not completed', 409)

  const originalPoints = assignment.pointsAwarded

  const updated = await prisma.$transaction(async (tx) => {
    await tx.choreAssignment.update({
      where: { id: assignmentId },
      data: { status: 'PENDING', completedAt: null, pointsAwarded: null },
    })
    await tx.pointLog.create({
      data: {
        userId: assignment.assignedToId,
        amount: -(originalPoints ?? 0),
        type: 'REVERSED',
        reason: assignment.template?.title ?? 'Unknown',
      },
    })
    return tx.choreAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        template: { select: { id: true, title: true, points: true, category: true } },
        assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
      },
    })
  })

  return updated
}

export async function delete_(assignmentId: number) {
  const assignment = await prisma.choreAssignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) throw new AppError('Assignment not found', 404)
  if (assignment.status === 'COMPLETED') throw new AppError('Cannot delete a completed assignment. Uncomplete it first.', 409)

  await prisma.choreAssignment.delete({ where: { id: assignmentId } })
  return { deleted: true }
}

export async function notifyDueSoon(
  items: Array<{
    id: number
    type: 'REGULAR' | 'RECURRING'
    dueDate: string
    status: string
    dueNotifiedAt: string | null
    assignedTo: { ntfyTopic: string | null } | null
    template: { title: string; points: number }
  }>
): Promise<Set<number>> {
  if (!isNtfyConfigured) return new Set()

  const today = new Date().toISOString().slice(0, 10)
  const dueItems = items.filter(
    (i) =>
      i.dueDate === today &&
      (i.status === 'PENDING' || i.status === 'PARTIALLY_COMPLETE') &&
      !i.dueNotifiedAt &&
      i.assignedTo?.ntfyTopic
  )

  if (dueItems.length === 0) return new Set()

  const notified = new Set<number>()

  for (const item of dueItems) {
    const topic = item.assignedTo!.ntfyTopic!
    const { title, body, priority, tags, click } = dueSoonBody({
      id: item.id,
      template: { title: item.template.title, points: item.template.points },
      dueDate: new Date(item.dueDate + 'T00:00:00'),
    })

    const ok = await sendNtfy(topic, title, body, { priority, tags, click })
    if (!ok) continue

    if (item.type === 'REGULAR') {
      await prisma.choreAssignment.updateMany({
        where: { id: item.id, dueNotifiedAt: null },
        data: { dueNotifiedAt: new Date() },
      })
    } else {
      await prisma.recurringOccurrence.updateMany({
        where: { id: item.id, dueNotifiedAt: null },
        data: { dueNotifiedAt: new Date() },
      })
    }

    notified.add(item.id)
  }

  return notified
}

function isRecordNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2025'
  )
}
