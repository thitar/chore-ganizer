jest.mock('../../config/prisma', () => ({
  prisma: {
    choreTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    choreAssignment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

let templateService: typeof import('../../services/template.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/template.service')]
  templateService = require('../../services/template.service')
})

describe('templateService.create', () => {
  it('creates a template and returns it', async () => {
    const input = { title: 'Wash Dishes', description: 'Clean them all', points: 10, category: 'kitchen', createdById: 1 }
    const expected = { id: 1, ...input, createdAt: new Date(), updatedAt: new Date() }
    prisma.choreTemplate.create.mockResolvedValue(expected)

    const result = await templateService.create(input)

    expect(prisma.choreTemplate.create).toHaveBeenCalledWith({ data: input })
    expect(result).toBe(expected)
  })
})

describe('templateService.getAll', () => {
  it('returns all templates sorted by title ascending', async () => {
    const templates = [
      { id: 2, title: 'Clean Room', points: 15, category: 'bedroom' },
      { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    ]
    prisma.choreTemplate.findMany.mockResolvedValue(templates)

    const result = await templateService.getAll()

    expect(prisma.choreTemplate.findMany).toHaveBeenCalledWith({ orderBy: { title: 'asc' } })
    expect(result).toBe(templates)
  })
})

describe('templateService.update', () => {
  it('updates template and returns it', async () => {
    const updated = { id: 1, title: 'New Title', description: 'Updated', points: 20, category: 'kitchen' }
    prisma.choreTemplate.update.mockResolvedValue(updated)

    const result = await templateService.update(1, { title: 'New Title' })

    expect(prisma.choreTemplate.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { title: 'New Title' } })
    expect(result).toBe(updated)
  })

  it('throws AppError 404 when template not found', async () => {
    prisma.choreTemplate.update.mockRejectedValue({ code: 'P2025' })

    await expect(templateService.update(99999, { title: 'X' })).rejects.toThrow(AppError)
    await expect(templateService.update(99999, { title: 'X' })).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('templateService.delete_', () => {
  it('deletes template and pending assignments in transaction when no completed assignments exist', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => {
      await Promise.all(ops)
      return []
    })

    const result = await templateService.delete_(1)

    expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith({
      where: { choreTemplateId: 1, status: 'COMPLETED' },
    })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(result).toEqual({ deleted: true })
  })

  it('throws AppError 409 when completed assignments exist', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([{ id: 5, status: 'COMPLETED' }])

    await expect(templateService.delete_(1)).rejects.toThrow(AppError)
    await expect(templateService.delete_(1)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws AppError 404 when template does not exist', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([])
    prisma.$transaction.mockRejectedValue({ code: 'P2025' })

    await expect(templateService.delete_(1)).rejects.toThrow(AppError)
    await expect(templateService.delete_(1)).rejects.toMatchObject({ statusCode: 404 })
  })
})
