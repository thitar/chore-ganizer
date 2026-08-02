jest.mock('../../config/notifications', () => ({
  isNtfyConfigured: true,
  getNtfyConfig: jest.fn(() => ({ baseUrl: 'https://ntfy.example.com' })),
  getOverdueConfig: jest.fn(() => ({ timezone: 'Europe/Oslo', hour: 8, minute: 0 })),
}))

jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findMany: jest.fn(), updateMany: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), updateMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}))

const { prisma } = require('../../config/prisma')

let notifyOverdue: typeof import('../../services/overdue.notification.service').notifyOverdue
let localDateStr: typeof import('../../services/overdue.notification.service').localDateStr

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/overdue.notification.service')]
  const mod = require('../../services/overdue.notification.service')
  notifyOverdue = mod.notifyOverdue
  localDateStr = mod.localDateStr
})

describe('localDateStr', () => {
  it('formats a UTC date into a date string in the configured timezone', () => {
    expect(localDateStr(new Date('2026-08-02T00:00:00Z'), 'Europe/Oslo')).toBe('2026-08-02')
    expect(localDateStr(new Date('2026-08-02T22:00:00Z'), 'Europe/Oslo')).toBe('2026-08-03')
  })
})

describe('notifyOverdue', () => {
  const REGULAR = {
    id: 1, dueDate: new Date('2026-08-02T00:00:00Z'),
    assignedTo: { ntfyTopic: 'alice-topic' },
    template: { title: 'Wash Dishes', points: 10 },
  }
  const RECURRING = {
    id: 7, dueDate: new Date('2026-08-02T00:00:00Z'),
    assignedTo: { ntfyTopic: 'alice-topic' },
    chore: { template: { title: 'Sweep Floor', points: 5 } },
  }

  beforeEach(() => {
    prisma.choreAssignment.findMany.mockResolvedValue([REGULAR])
    prisma.recurringOccurrence.findMany.mockResolvedValue([RECURRING])
    prisma.user.findMany.mockResolvedValue([
      { ntfyTopic: 'dad-topic' },
      { ntfyTopic: null },
    ])
  })

  it('sends to the child and each parent at 08:00 CET the day after the due date', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

    await notifyOverdue(new Date('2026-08-03T06:00:00Z'))

    // 2 eligible items (REGULAR + RECURRING) × 2 recipients each (child + dad) = 4
    expect(fetchSpy).toHaveBeenCalledTimes(4)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/alice-topic',
      expect.objectContaining({
        method: 'POST',
        body: 'Wash Dishes — overdue',
        headers: expect.objectContaining({ Title: 'Chore-Ganizer', Priority: '5', Tags: 'warning,exclamation', Click: '/chores/1' }),
      })
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/dad-topic',
      expect.objectContaining({ method: 'POST' })
    )
    expect(prisma.choreAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, overdueNotifiedAt: null },
      data: { overdueNotifiedAt: expect.any(Date) },
    })
    expect(prisma.recurringOccurrence.updateMany).toHaveBeenCalledWith({
      where: { id: 7, overdueNotifiedAt: null },
      data: { overdueNotifiedAt: expect.any(Date) },
    })
    fetchSpy.mockRestore()
  })

  it('does not send before 08:00 local time', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

    await notifyOverdue(new Date('2026-08-03T05:00:00Z'))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does not notify a chore due today (not yet overdue)', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      { ...REGULAR, dueDate: new Date('2026-08-03T00:00:00Z') },
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

    await notifyOverdue(new Date('2026-08-03T06:00:00Z'))

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does nothing when ntfy is disabled', async () => {
    // The sweep reads isNtfyConfigured live through notification.service's
    // re-export (a getter), so toggle the value on the config module and
    // re-require the sweep.
    const config = require('../../config/notifications')
    const original = config.isNtfyConfigured
    config.isNtfyConfigured = false
    delete require.cache[require.resolve('../../services/overdue.notification.service')]
    notifyOverdue = require('../../services/overdue.notification.service').notifyOverdue
    try {
      await notifyOverdue(new Date('2026-08-03T06:00:00Z'))
      expect(prisma.choreAssignment.findMany).not.toHaveBeenCalled()
      expect(prisma.recurringOccurrence.findMany).not.toHaveBeenCalled()
    } finally {
      config.isNtfyConfigured = original
      delete require.cache[require.resolve('../../services/overdue.notification.service')]
      notifyOverdue = require('../../services/overdue.notification.service').notifyOverdue
    }
  })

  it('does not throw when a send fails (fire-and-forget)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(notifyOverdue(new Date('2026-08-03T06:00:00Z'))).resolves.toBeUndefined()
  })
})
