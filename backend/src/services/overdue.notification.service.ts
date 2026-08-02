import { prisma } from '../config/prisma'
import { sendNtfy, isNtfyConfigured, getOverdueConfig } from './notification.service'
import { overdueBody } from './notification.formatters'

export function localDateStr(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function localTime(date: Date, timezone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  return { hour: Number(get('hour')), minute: Number(get('minute')) }
}

export async function notifyOverdue(now = new Date()): Promise<void> {
  if (!isNtfyConfigured) return

  const { timezone, hour, minute } = getOverdueConfig()
  const todayStr = localDateStr(now, timezone)
  const { hour: curHour, minute: curMinute } = localTime(now, timezone)
  const isPastSendTime = curHour > hour || (curHour === hour && curMinute >= minute)
  if (!isPastSendTime) return

  const tomorrow = new Date(`${todayStr}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: { status: 'PENDING', overdueNotifiedAt: null, dueDate: { lt: tomorrow } },
      select: {
        id: true,
        dueDate: true,
        assignedTo: { select: { ntfyTopic: true } },
        template: { select: { title: true, points: true } },
      },
    }),
    prisma.recurringOccurrence.findMany({
      where: { status: 'PENDING', overdueNotifiedAt: null, dueDate: { lt: tomorrow } },
      select: {
        id: true,
        dueDate: true,
        assignedTo: { select: { ntfyTopic: true } },
        chore: { select: { template: { select: { title: true, points: true } } } },
      },
    }),
  ])

  const regular = assignments.map((a) => ({
    id: a.id,
    type: 'REGULAR' as const,
    dueDate: a.dueDate,
    assignedTo: a.assignedTo,
    template: a.template,
  }))
  const recurring = occurrences
    .filter((o) => o.chore !== null)
    .map((o) => ({
      id: o.id,
      type: 'RECURRING' as const,
      dueDate: o.dueDate,
      assignedTo: o.assignedTo,
      template: o.chore!.template,
    }))

  const overdueItems = [...regular, ...recurring].filter(
    (item) => localDateStr(item.dueDate, timezone) < todayStr
  )
  if (overdueItems.length === 0) return

  const parents = await prisma.user.findMany({ where: { role: 'PARENT' }, select: { ntfyTopic: true } })

  for (const item of overdueItems) {
    const { title, body, priority, tags, click } = overdueBody({
      id: item.id,
      template: item.template,
      dueDate: item.dueDate,
    })

    if (item.type === 'REGULAR') {
      await prisma.choreAssignment.updateMany({
        where: { id: item.id, overdueNotifiedAt: null },
        data: { overdueNotifiedAt: now },
      })
    } else {
      await prisma.recurringOccurrence.updateMany({
        where: { id: item.id, overdueNotifiedAt: null },
        data: { overdueNotifiedAt: now },
      })
    }

    if (item.assignedTo?.ntfyTopic) {
      void sendNtfy(item.assignedTo.ntfyTopic, title, body, { priority, tags, click })
    }
    for (const parent of parents) {
      if (parent.ntfyTopic) {
        void sendNtfy(parent.ntfyTopic, title, body, { priority, tags, click })
      }
    }
  }
}
