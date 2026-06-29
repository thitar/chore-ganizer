jest.mock('../../config/prisma', () => ({
  prisma: {
    choreTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    choreAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pointLog: {
      create: jest.fn(),
    },
    recurringChore: {
      findMany: jest.fn(),
    },
    recurringOccurrence: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

let assignmentService: typeof import('../../services/assignment.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/assignment.service')]
  prisma.recurringChore.findMany.mockResolvedValue([])
  prisma.recurringOccurrence.findMany.mockResolvedValue([])
  assignmentService = require('../../services/assignment.service')
})

describe('assignmentService.create', () => {
  it('creates assignment with status PENDING and returns with includes', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
    const created = {
      id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-06-01'),
      status: 'PENDING', pointsAwarded: null, notes: null,
    }
    prisma.choreAssignment.create.mockResolvedValue(created)

    const result = await assignmentService.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-06-01' })

    expect(prisma.choreTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(prisma.choreAssignment.create).toHaveBeenCalled()
    expect(result).toBe(created)
  })

  it('throws AppError 404 when template does not exist', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue(null)

    await expect(assignmentService.create({ choreTemplateId: 999, assignedToId: 2, dueDate: '2026-06-01' }))
      .rejects.toMatchObject({ statusCode: 404, message: 'Template not found' })
  })
})

describe('assignmentService.getAll', () => {
  it('returns all assignments for PARENT role', async () => {
    const assignments = [
      {
        id: 1,
        choreTemplateId: 1,
        assignedToId: 3,
        dueDate: new Date('2026-06-15T00:00:00Z'),
        status: 'PENDING',
        completedAt: null,
        pointsAwarded: null,
        notes: null,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
        assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
      },
    ]
    prisma.choreAssignment.findMany.mockResolvedValue(assignments)

    const result = await assignmentService.getAll(1, 'PARENT')

    expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{}, expect.objectContaining({ dueDate: expect.any(Object) })] } })
    )
    expect(result[0]).toMatchObject({ id: 1, type: 'REGULAR' })
    expect(result[0].dueDate).toBe('2026-06-15')
  })

  it('returns only own assignments for CHILD role', async () => {
    const assignments = [
      {
        id: 3,
        choreTemplateId: 2,
        assignedToId: 3,
        dueDate: new Date('2026-06-20T00:00:00Z'),
        status: 'PENDING',
        completedAt: null,
        pointsAwarded: null,
        notes: null,
        createdAt: new Date('2026-06-05T00:00:00Z'),
        template: { id: 2, title: 'Clean Room', points: 15, category: 'bedroom' },
        assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
      },
    ]
    prisma.choreAssignment.findMany.mockResolvedValue(assignments)

    const result = await assignmentService.getAll(3, 'CHILD')

    expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [expect.objectContaining({ assignedToId: 3 }), expect.objectContaining({ dueDate: expect.any(Object) })] } })
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
    expect(result[0].type).toBe('REGULAR')
  })
})

describe('assignmentService.update', () => {
  it('updates date and returns with includes', async () => {
    const updated = { id: 1, dueDate: new Date('2026-07-01') }
    prisma.choreAssignment.update.mockResolvedValue(updated)

    const result = await assignmentService.update(1, { dueDate: '2026-07-01' })

    expect(prisma.choreAssignment.update).toHaveBeenCalled()
    expect(result).toBe(updated)
  })

  it('throws AppError 404 when assignment not found', async () => {
    prisma.choreAssignment.update.mockRejectedValue({ code: 'P2025' })

    await expect(assignmentService.update(999, { dueDate: '2026-07-01' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('assignmentService.complete', () => {
  const mockAssignment = {
    id: 1,
    assignedToId: 2,
    status: 'PENDING',
    template: { id: 1, title: 'Wash Dishes', points: 10 },
  }
  const completed = { ...mockAssignment, status: 'COMPLETED', pointsAwarded: 10, completedAt: new Date() }

  it('completes assignment in transaction, awards points, creates PointLog', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(mockAssignment)
    prisma.$transaction.mockImplementation(async (cb: Function) => {
      const tx = {
        choreAssignment: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue(completed) },
        pointLog: { create: jest.fn() },
      }
      return cb(tx)
    })

    const result = await assignmentService.complete(1, 2)

    expect(result).toBe(completed)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('throws AppError 403 when non-owner tries to complete', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(mockAssignment)

    await expect(assignmentService.complete(1, 999))
      .rejects.toMatchObject({ statusCode: 403, message: 'You can only complete your own assignments' })
  })

  it('throws AppError 409 when already completed', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...mockAssignment, status: 'COMPLETED' })

    await expect(assignmentService.complete(1, 2))
      .rejects.toMatchObject({ statusCode: 409, message: 'Assignment is already completed' })
  })

  it('throws AppError 404 when assignment not found', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)

    await expect(assignmentService.complete(999, 2))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('assignmentService.uncomplete', () => {
  const mockCompleted = {
    id: 1,
    assignedToId: 2,
    status: 'COMPLETED',
    pointsAwarded: 10,
    template: { title: 'Wash Dishes' },
  }

  it('uncompletes assignment in transaction, creates REVERSED PointLog', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(mockCompleted)
    const uncompleted = { ...mockCompleted, status: 'PENDING', pointsAwarded: null, completedAt: null }
    prisma.$transaction.mockImplementation(async (cb: Function) => {
      const tx = {
        choreAssignment: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue(uncompleted) },
        pointLog: { create: jest.fn() },
      }
      return cb(tx)
    })

    const result = await assignmentService.uncomplete(1)

    expect(result).toBe(uncompleted)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('throws AppError 409 when assignment is PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...mockCompleted, status: 'PENDING', pointsAwarded: null })

    await expect(assignmentService.uncomplete(1))
      .rejects.toMatchObject({ statusCode: 409, message: 'Assignment is not completed' })
  })

  it('throws AppError 404 when assignment not found', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)

    await expect(assignmentService.uncomplete(999))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('assignmentService.delete_', () => {
  it('deletes pending assignment', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' })
    prisma.choreAssignment.delete.mockResolvedValue({ id: 1 })

    const result = await assignmentService.delete_(1)

    expect(result).toEqual({ deleted: true })
    expect(prisma.choreAssignment.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('throws AppError 409 when assignment is completed', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'COMPLETED' })

    await expect(assignmentService.delete_(1))
      .rejects.toMatchObject({ statusCode: 409, message: 'Cannot delete a completed assignment. Uncomplete it first.' })
  })

  it('throws AppError 404 when assignment not found', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)

    await expect(assignmentService.delete_(999))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
