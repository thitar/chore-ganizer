jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    pointLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

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
      id: 1, choreTemplateId: 1, assignedToId: 3, dueDate: new Date('2026-07-01T00:00:00Z'),
      status: 'PENDING', dueNotifiedAt: null, overdueNotifiedAt: null, cancelledAt: null,
      completedAt: null, pointsAwarded: null, notes: null, createdAt: new Date('2026-06-01'),
      template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    }
    const occurrence = {
      id: 10, recurringChoreId: 5, assignedToId: 3, dueDate: new Date('2026-07-02T00:00:00Z'),
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
    expect(result[0]).toMatchObject({ id: 1, type: 'REGULAR' })
    expect(result[1]).toMatchObject({ id: 10, type: 'RECURRING' })
    expect(result[0].dueDate).toBe('2026-07-01')
    expect(result[1].dueDate).toBe('2026-07-02')
  })
})

describe('overdueService.cancel', () => {
  const pending = { id: 1, assignedToId: 3, status: 'PENDING', template: { id: 1, title: 'Wash Dishes', points: 10 } }
  const cancelled = { ...pending, status: 'CANCELLED', cancelledAt: new Date(), penaltyPoints: 10 }

  it('REGULAR: sets CANCELLED and writes a PENALTY PointLog when penalty > 0', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pending)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => {
      prisma.choreAssignment.update.mockResolvedValue(cancelled)
      prisma.choreAssignment.findUnique.mockResolvedValue(cancelled)
      return cb(prisma)
    })

    const result = await overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 10 })

    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 1 },
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
      prisma.choreAssignment.update.mockResolvedValue(cancelled)
      prisma.choreAssignment.findUnique.mockResolvedValue({ ...cancelled, penaltyPoints: null })
      return cb(prisma)
    })

    await overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 0 })

    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: null },
    })
    expect(prisma.pointLog.create).not.toHaveBeenCalled()
  })

  it('RECURRING: writes a PENALTY PointLog for the occurrence', async () => {
    const occ = { id: 7, assignedToId: 3, status: 'PENDING', chore: { template: { id: 2, title: 'Sweep Floor', points: 5 } } }
    prisma.recurringOccurrence.findUnique.mockResolvedValue(occ)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma))

    await overdueService.cancel({ id: 7, type: 'RECURRING', penalty: 5 })

    expect(prisma.recurringOccurrence.update).toHaveBeenCalledWith({
      where: { id: 7 },
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
})

describe('overdueService.reschedule', () => {
  it('updates dueDate and clears both notification dedup flags', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' })
    prisma.choreAssignment.update.mockResolvedValue({ id: 1, status: 'PENDING', dueDate: new Date('2026-08-10') })

    const result = await overdueService.reschedule({ id: 1, dueDate: '2026-08-10' })

    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { dueDate: new Date('2026-08-10'), dueNotifiedAt: null, overdueNotifiedAt: null },
    })
    expect(result.dueDate).toEqual(new Date('2026-08-10'))
  })

  it('throws 404 when assignment missing', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    await expect(overdueService.reschedule({ id: 999, dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when assignment is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'COMPLETED' })
    await expect(overdueService.reschedule({ id: 1, dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 409 })
  })
})
