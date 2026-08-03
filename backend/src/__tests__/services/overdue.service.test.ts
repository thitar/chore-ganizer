jest.mock('../../config/notifications', () => ({
  isNtfyConfigured: true,
  getNtfyConfig: jest.fn(),
  getOverdueConfig: jest.fn(() => ({ timezone: 'Europe/Oslo', hour: 8, minute: 0 })),
}))

jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    pointLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')

let overdueService: typeof import('../../services/overdue.service')

beforeEach(() => {
  jest.clearAllMocks()
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma))
  delete require.cache[require.resolve('../../services/overdue.service')]
  overdueService = require('../../services/overdue.service')
})

describe('overdueService.listOverdue', () => {
  it('queries both tables for PENDING before today and returns combined sorted shape', async () => {
    const assignment = {
      id: 1, choreTemplateId: 1, assignedToId: 3, dueDate: new Date('2026-07-05T00:00:00Z'),
      status: 'PENDING', dueNotifiedAt: null, overdueNotifiedAt: null, cancelledAt: null,
      completedAt: null, pointsAwarded: null, notes: null, createdAt: new Date('2026-06-01'),
      template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    }
    const occurrence = {
      id: 10, recurringChoreId: 5, assignedToId: 3, dueDate: new Date('2026-07-01T00:00:00Z'),
      status: 'PENDING', dueNotifiedAt: null, overdueNotifiedAt: null, cancelledAt: null,
      completedAt: null, pointsAwarded: null, createdAt: new Date('2026-06-01'),
      chore: {
        id: 5, choreTemplateId: 2,
        template: { id: 2, title: 'Sweep Floor', points: 5, category: 'kitchen' },
      },
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    }
    prisma.choreAssignment.findMany.mockResolvedValue([assignment])
    prisma.recurringOccurrence.findMany.mockResolvedValue([occurrence])

    const result = await overdueService.listOverdue()

    expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', dueDate: { lt: expect.any(Date) } } })
    )
    expect(prisma.recurringOccurrence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', dueDate: { lt: expect.any(Date) } } })
    )
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.dueDate)).toEqual(['2026-07-01', '2026-07-05'])
    expect(result[0]).toMatchObject({ id: 10, type: 'RECURRING' })
    expect(result[1]).toMatchObject({ id: 1, type: 'REGULAR' })
    expect(result[0].dueDate).toBe('2026-07-01')
    expect(result[1].dueDate).toBe('2026-07-05')
  })

  it('uses the NOTIFY_TIMEZONE start-of-day as the overdue boundary, not UTC', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])

    // 2026-07-05T20:00:00Z is 22:00 local on 2026-07-05 in Europe/Oslo (UTC+2).
    await overdueService.listOverdue(new Date('2026-07-05T20:00:00Z'))

    // Start of 2026-07-05 in Europe/Oslo is 2026-07-04T22:00:00Z, not 2026-07-05T00:00:00Z.
    expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dueDate: { lt: new Date('2026-07-04T22:00:00Z') } }),
      })
    )
    expect(prisma.recurringOccurrence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dueDate: { lt: new Date('2026-07-04T22:00:00Z') } }),
      })
    )
  })
})

describe('overdueService.cancel', () => {
  const pending = { id: 1, assignedToId: 3, status: 'PENDING', template: { id: 1, title: 'Wash Dishes', points: 10 } }
  const cancelled = { ...pending, status: 'CANCELLED', cancelledAt: new Date(), penaltyPoints: 10 }

  it('REGULAR: sets CANCELLED and writes a PENALTY PointLog when penalty > 0', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pending)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => {
      prisma.choreAssignment.updateMany.mockResolvedValue({ count: 1 })
      prisma.choreAssignment.findUnique.mockResolvedValue(cancelled)
      return cb(prisma)
    })

    const result = await overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 10 })

    expect(prisma.choreAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: 10 },
    })
    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: { userId: 3, amount: -10, type: 'PENALTY', reason: 'Overdue: Wash Dishes' },
    })
    expect(result.status).toBe('CANCELLED')
  })

  it('REGULAR: penalty 0 sets no penaltyPoints and writes no PointLog', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pending)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => {
      prisma.choreAssignment.updateMany.mockResolvedValue({ count: 1 })
      prisma.choreAssignment.findUnique.mockResolvedValue({ ...cancelled, penaltyPoints: null })
      return cb(prisma)
    })

    await overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 0 })

    expect(prisma.choreAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: null },
    })
    expect(prisma.pointLog.create).not.toHaveBeenCalled()
  })

  it('RECURRING: writes a PENALTY PointLog for the occurrence', async () => {
    const occ = { id: 7, assignedToId: 3, status: 'PENDING', chore: { template: { id: 2, title: 'Sweep Floor', points: 5 } } }
    prisma.recurringOccurrence.findUnique.mockResolvedValue(occ)
    prisma.recurringOccurrence.updateMany.mockResolvedValue({ count: 1 })
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma))

    await overdueService.cancel({ id: 7, type: 'RECURRING', penalty: 5 })

    expect(prisma.recurringOccurrence.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: 5 },
    })
    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: { userId: 3, amount: -5, type: 'PENALTY', reason: 'Overdue: Sweep Floor' },
    })
  })

  it('throws 404 when REGULAR row missing', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    await expect(overdueService.cancel({ id: 999, type: 'REGULAR' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when REGULAR row is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...pending, status: 'CANCELLED' })
    await expect(overdueService.cancel({ id: 1, type: 'REGULAR' })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 404 when RECURRING row missing', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue(null)
    await expect(overdueService.cancel({ id: 999, type: 'RECURRING' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when RECURRING row is COMPLETED', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({ id: 7, status: 'COMPLETED' })
    await expect(overdueService.cancel({ id: 7, type: 'RECURRING' })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 400 when penalty is negative', async () => {
    await expect(overdueService.cancel({ id: 1, type: 'REGULAR', penalty: -1 })).rejects.toMatchObject({ statusCode: 400 })
    expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
    expect(prisma.recurringOccurrence.updateMany).not.toHaveBeenCalled()
    expect(prisma.pointLog.create).not.toHaveBeenCalled()
  })

  it('REGULAR: throws 409 and writes no PointLog when the row is no longer PENDING at update time (lost race)', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pending)
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 0 })
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma))

    await expect(overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 10 })).rejects.toMatchObject({ statusCode: 409 })
    expect(prisma.pointLog.create).not.toHaveBeenCalled()
  })

  it('RECURRING: throws 409 and writes no PointLog when the row is no longer PENDING at update time (lost race)', async () => {
    const occ = { id: 7, assignedToId: 3, status: 'PENDING', chore: { template: { id: 2, title: 'Sweep Floor', points: 5 } } }
    prisma.recurringOccurrence.findUnique.mockResolvedValue(occ)
    prisma.recurringOccurrence.updateMany.mockResolvedValue({ count: 0 })
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma))

    await expect(overdueService.cancel({ id: 7, type: 'RECURRING', penalty: 5 })).rejects.toMatchObject({ statusCode: 409 })
    expect(prisma.pointLog.create).not.toHaveBeenCalled()
  })
})

describe('overdueService.reschedule', () => {
  it('updates dueDate and clears both notification dedup flags', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'PENDING', dueDate: new Date('2026-08-10') })
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 1 })

    const result = await overdueService.reschedule({ id: 1, type: 'REGULAR', dueDate: '2026-08-10' })

    expect(prisma.choreAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { dueDate: new Date('2026-08-10'), dueNotifiedAt: null, overdueNotifiedAt: null },
    })
    expect(result.dueDate).toEqual(new Date('2026-08-10'))
  })

  it('throws 404 when assignment missing', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    await expect(overdueService.reschedule({ id: 999, type: 'REGULAR', dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when assignment is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'COMPLETED' })
    await expect(overdueService.reschedule({ id: 1, type: 'REGULAR', dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 409 when the assignment is no longer PENDING at update time (lost race)', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' })
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 0 })

    await expect(overdueService.reschedule({ id: 1, type: 'REGULAR', dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 400 when type is not REGULAR', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' })

    await expect(
      overdueService.reschedule({ id: 1, type: 'RECURRING', dueDate: '2026-08-10' })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(prisma.choreAssignment.findUnique).not.toHaveBeenCalled()
    expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
  })
})
