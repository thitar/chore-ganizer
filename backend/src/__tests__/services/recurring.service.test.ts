jest.mock('../../config/prisma', () => ({
  prisma: {
    choreTemplate: {
      findUnique: jest.fn(),
    },
    recurringChore: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    recurringOccurrence: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pointLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

let recurringService: typeof import('../../services/recurring.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/recurring.service')]
  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
    }
    if (Array.isArray(arg)) {
      await Promise.all(arg)
      return arg
    }
    return []
  })
  recurringService = require('../../services/recurring.service')
})

describe('recurringService.create', () => {
  it('validates template exists and creates a recurring chore', async () => {
    const input = {
      choreTemplateId: 1,
      assignedToId: 3,
      frequency: 'DAILY' as const,
      dayOfWeek: null,
      dayOfMonth: null,
      createdById: 1,
    }
    prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1, title: 'Make Bed' })
    prisma.recurringChore.create.mockResolvedValue({
      id: 10,
      ...input,
      template: { id: 1, title: 'Make Bed', points: 5, category: 'bedroom' },
      assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
    })

    const result = await recurringService.create(input)

    expect(prisma.choreTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(prisma.recurringChore.create).toHaveBeenCalledWith({
      data: input,
      include: {
        template: { select: { id: true, title: true, points: true, category: true } },
        assignedTo: { select: { id: true, name: true, color: true } },
      },
    })
    expect(result.id).toBe(10)
  })

  it('throws AppError 404 when template does not exist', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue(null)

    await expect(
      recurringService.create({ choreTemplateId: 999, assignedToId: 1, frequency: 'DAILY', createdById: 1 })
    ).rejects.toThrow(AppError)
    await expect(
      recurringService.create({ choreTemplateId: 999, assignedToId: 1, frequency: 'DAILY', createdById: 1 })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('recurringService.getAll', () => {
  it('returns all recurring chores with template and assignee', async () => {
    const chores = [
      {
        id: 1,
        frequency: 'DAILY',
        template: { id: 1, title: 'Make Bed', points: 5, category: 'bedroom' },
        assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
      },
    ]
    prisma.recurringChore.findMany.mockResolvedValue(chores)

    const result = await recurringService.getAll()

    expect(prisma.recurringChore.findMany).toHaveBeenCalledWith({
      include: {
        template: { select: { id: true, title: true, points: true, category: true } },
        assignedTo: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(result).toBe(chores)
  })
})

describe('recurringService.generateOccurrences', () => {
  it('generates daily occurrences for every date in range when none exist', async () => {
    const chore = { id: 1, frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, assignedToId: 3 }
    prisma.recurringChore.findMany.mockResolvedValue([chore])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.createMany.mockResolvedValue({ count: 30 })

    const from = new Date('2026-06-01T00:00:00Z')
    const to = new Date('2026-06-30T00:00:00Z')

    await recurringService.generateOccurrences(from, to)

    expect(prisma.recurringChore.findMany).toHaveBeenCalled()
    expect(prisma.recurringOccurrence.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
      })
    )
    const call = prisma.recurringOccurrence.createMany.mock.calls[0][0]
    expect(call.data.length).toBe(30)
  })

  it('generates weekly occurrences only on matching dayOfWeek', async () => {
    const chore = { id: 2, frequency: 'WEEKLY', dayOfWeek: 1, dayOfMonth: null, assignedToId: 4 }
    prisma.recurringChore.findMany.mockResolvedValue([chore])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.createMany.mockResolvedValue({ count: 5 })

    const from = new Date('2026-06-01T00:00:00Z')
    const to = new Date('2026-06-30T00:00:00Z')

    await recurringService.generateOccurrences(from, to)

    const call = prisma.recurringOccurrence.createMany.mock.calls[0][0]
    expect(call.data.length).toBe(5)
    call.data.forEach((d: { dueDate: Date }) => {
      expect(d.dueDate.getUTCDay()).toBe(1)
    })
  })

  it('generates monthly occurrences on matching dayOfMonth', async () => {
    const chore = { id: 3, frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 15, assignedToId: 3 }
    prisma.recurringChore.findMany.mockResolvedValue([chore])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.createMany.mockResolvedValue({ count: 1 })

    const from = new Date('2026-06-01T00:00:00Z')
    const to = new Date('2026-06-30T00:00:00Z')

    await recurringService.generateOccurrences(from, to)

    const call = prisma.recurringOccurrence.createMany.mock.calls[0][0]
    expect(call.data.length).toBe(1)
    expect(call.data[0].dueDate.getUTCDate()).toBe(15)
  })

  it('is idempotent — does not create occurrences for dates that already exist', async () => {
    const chore = { id: 1, frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, assignedToId: 3 }
    prisma.recurringChore.findMany.mockResolvedValue([chore])
    const existingDates = [
      { dueDate: new Date('2026-06-01T00:00:00Z') },
      { dueDate: new Date('2026-06-02T00:00:00Z') },
    ]
    prisma.recurringOccurrence.findMany.mockResolvedValue(existingDates)
    prisma.recurringOccurrence.createMany.mockResolvedValue({ count: 28 })

    const from = new Date('2026-06-01T00:00:00Z')
    const to = new Date('2026-06-30T00:00:00Z')

    await recurringService.generateOccurrences(from, to)

    const call = prisma.recurringOccurrence.createMany.mock.calls[0][0]
    expect(call.data.length).toBe(28)
  })

  it('clamps monthly dayOfMonth to last day of month', async () => {
    const chore = { id: 3, frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 31, assignedToId: 3 }
    prisma.recurringChore.findMany.mockResolvedValue([chore])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    prisma.recurringOccurrence.createMany.mockResolvedValue({ count: 2 })

    const from = new Date('2026-01-01T00:00:00Z')
    const to = new Date('2026-02-28T00:00:00Z')

    await recurringService.generateOccurrences(from, to)

    const call = prisma.recurringOccurrence.createMany.mock.calls[0][0]
    expect(call.data.length).toBe(2)
    expect(call.data[0].dueDate.getUTCDate()).toBe(31)
    expect(call.data[1].dueDate.getUTCDate()).toBe(28)
  })
})

describe('recurringService.completeOccurrence', () => {
  it('completes the occurrence and creates EARNED PointLog in transaction', async () => {
    const occurrence = {
      id: 1,
      assignedToId: 3,
      status: 'PENDING',
      chore: { template: { id: 1, title: 'Make Bed', points: 5 } },
    }
    prisma.recurringOccurrence.findUnique.mockResolvedValue(occurrence)
    const updated = { ...occurrence, status: 'COMPLETED', pointsAwarded: 5 }
    prisma.recurringOccurrence.update.mockResolvedValue(updated)
    prisma.pointLog.create.mockResolvedValue({})
    prisma.recurringOccurrence.findUnique
      .mockResolvedValueOnce(occurrence)
      .mockResolvedValueOnce({
        ...updated,
        chore: { template: { id: 1, title: 'Make Bed', points: 5, category: 'bedroom' } },
        assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
      })

    const result = await recurringService.completeOccurrence(1, 3)

    expect(prisma.recurringOccurrence.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'COMPLETED', pointsAwarded: 5 }),
    })
    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: {
        userId: 3,
        amount: 5,
        type: 'EARNED',
        reason: 'Make Bed',
      },
    })
    expect(result?.status).toBe('COMPLETED')
  })

  it('throws 403 when user is not the assignee', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({
      id: 1,
      assignedToId: 3,
      status: 'PENDING',
      chore: { template: { id: 1, title: 'Make Bed', points: 5 } },
    })

    await expect(recurringService.completeOccurrence(1, 999)).rejects.toThrow(AppError)
    await expect(recurringService.completeOccurrence(1, 999)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 409 when occurrence is already completed', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({
      id: 1,
      assignedToId: 3,
      status: 'COMPLETED',
      chore: { template: { id: 1, title: 'Make Bed', points: 5 } },
    })

    await expect(recurringService.completeOccurrence(1, 3)).rejects.toThrow(AppError)
    await expect(recurringService.completeOccurrence(1, 3)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 404 when occurrence does not exist', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue(null)

    await expect(recurringService.completeOccurrence(999, 3)).rejects.toThrow(AppError)
    await expect(recurringService.completeOccurrence(999, 3)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('recurringService.delete_', () => {
  it('deletes PENDING occurrences and the recurring chore', async () => {
    prisma.recurringChore.findUnique.mockResolvedValue({ id: 1 })
    prisma.recurringOccurrence.deleteMany.mockResolvedValue({ count: 5 })
    prisma.recurringChore.delete.mockResolvedValue({ id: 1 })

    const result = await recurringService.delete_(1)

    expect(prisma.recurringOccurrence.deleteMany).toHaveBeenCalledWith({
      where: { recurringChoreId: 1, status: 'PENDING' },
    })
    expect(prisma.recurringChore.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(result).toEqual({ deleted: true })
  })

  it('throws 404 when recurring chore does not exist', async () => {
    prisma.recurringChore.findUnique.mockResolvedValue(null)

    await expect(recurringService.delete_(999)).rejects.toThrow(AppError)
    await expect(recurringService.delete_(999)).rejects.toMatchObject({ statusCode: 404 })
  })
})
