import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { sendNtfy } from './notification.service'
import { nudgeBody } from './notification.formatters'

const NUDGE_COOLDOWN_MS = 15 * 60 * 1000

type Nudgeable = {
  id: number
  status: string
  dueDate: Date
  lastNudgedAt: Date | null
  template: { id: number; title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
}

async function loadNudgeable(id: number, type: 'REGULAR' | 'RECURRING'): Promise<Nudgeable | null> {
  if (type === 'REGULAR') {
    const a = await prisma.choreAssignment.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, title: true, points: true } },
        assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
      },
    })
    if (!a) return null
    return {
      id: a.id,
      status: a.status,
      dueDate: a.dueDate,
      lastNudgedAt: a.lastNudgedAt,
      template: a.template,
      assignedTo: a.assignedTo,
    }
  }
  const o = await prisma.recurringOccurrence.findUnique({
    where: { id },
    include: {
      chore: { include: { template: { select: { id: true, title: true, points: true } } } },
      assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
    },
  })
  if (!o || !o.chore) return null
  return {
    id: o.id,
    status: o.status,
    dueDate: o.dueDate,
    lastNudgedAt: o.lastNudgedAt,
    template: o.chore.template,
    assignedTo: o.assignedTo,
  }
}

export async function nudge({ id, type, parentId }: { id: number; type: 'REGULAR' | 'RECURRING'; parentId: number }) {
  const [row, parent] = await Promise.all([
    loadNudgeable(id, type),
    prisma.user.findUnique({ where: { id: parentId }, select: { name: true } }),
  ])

  if (!row) throw new AppError('Chore not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be nudged', 409)
  if (!row.assignedTo.ntfyTopic) throw new AppError('This child has not enabled push notifications', 400)

  const elapsed = row.lastNudgedAt ? Date.now() - row.lastNudgedAt.getTime() : Infinity
  if (elapsed < NUDGE_COOLDOWN_MS) {
    const minutes = Math.ceil((NUDGE_COOLDOWN_MS - elapsed) / 60000)
    throw new AppError(`You already nudged this chore. Try again in ${minutes} min.`, 429)
  }

  const cutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS)
  const gateWhere = {
    id,
    status: 'PENDING',
    OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: cutoff } }],
  }
  const updated = await (type === 'REGULAR'
    ? prisma.choreAssignment.updateMany({ where: gateWhere, data: { lastNudgedAt: new Date() } })
    : prisma.recurringOccurrence.updateMany({ where: gateWhere, data: { lastNudgedAt: new Date() } }))
  if (updated.count === 0) {
    const current = await loadNudgeable(id, type)
    if (!current || current.status !== 'PENDING') {
      throw new AppError('Only pending chores can be nudged', 409)
    }
    throw new AppError('You already nudged this chore. Try again soon.', 429)
  }

  const { title, body, priority, tags, click } = nudgeBody(
    { id, template: row.template, dueDate: row.dueDate },
    parent?.name ?? 'your parent'
  )
  const sent = await sendNtfy(row.assignedTo.ntfyTopic, title, body, { priority, tags, click })
  if (!sent) {
    await (type === 'REGULAR'
      ? prisma.choreAssignment.updateMany({ where: { id }, data: { lastNudgedAt: row.lastNudgedAt } })
      : prisma.recurringOccurrence.updateMany({ where: { id }, data: { lastNudgedAt: row.lastNudgedAt } }))
    throw new AppError('Failed to deliver the reminder. Please try again.', 502)
  }

  return { id, type }
}
