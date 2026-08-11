jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findUnique: jest.fn(), updateMany: jest.fn() },
    recurringOccurrence: { findUnique: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}))

jest.mock('../../services/notification.service', () => ({
  sendNtfy: jest.fn().mockResolvedValue(true),
}))

const { prisma } = require('../../config/prisma')
const { sendNtfy } = require('../../services/notification.service')

let nudgeService: typeof import('../../services/nudge.service')

const pendingAssignment = {
  id: 5,
  status: 'PENDING',
  dueDate: new Date('2026-08-11'),
  lastNudgedAt: null,
  template: { id: 3, title: 'Load dishwasher', points: 20 },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
}

const COOLDOWN_MS = 15 * 60 * 1000

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/nudge.service')]
  nudgeService = require('../../services/nudge.service')
})

describe('nudgeService.nudge', () => {
  it('sends a push to the assignee and records lastNudgedAt (REGULAR)', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pendingAssignment)
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 1 })

    const result = await nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })

    expect(sendNtfy).toHaveBeenCalledWith(
      'alice-topic',
      'Chore-Ganizer',
      'Gentle reminder 👀 "Load dishwasher" is waiting · from Dad',
      { priority: 3, tags: ['bell', 'eyes'], click: '/chores/5' }
    )
    expect(prisma.choreAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: 5, OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: expect.any(Date) } }] },
      data: { lastNudgedAt: expect.any(Date) },
    })
    expect(result).toEqual({ id: 5, type: 'REGULAR' })
  })

  it('handles RECURRING occurrences', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({
      ...pendingAssignment,
      id: 9,
      chore: { template: { id: 4, title: 'Make Bed', points: 5 } },
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Mom' })
    prisma.recurringOccurrence.updateMany.mockResolvedValue({ count: 1 })

    const result = await nudgeService.nudge({ id: 9, type: 'RECURRING', parentId: 2 })

    expect(sendNtfy).toHaveBeenCalledWith(
      'alice-topic',
      'Chore-Ganizer',
      'Gentle reminder 👀 "Make Bed" is waiting · from Mom',
      expect.anything()
    )
    expect(prisma.recurringOccurrence.updateMany).toHaveBeenCalledWith({
      where: { id: 9, OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: expect.any(Date) } }] },
      data: { lastNudgedAt: expect.any(Date) },
    })
    expect(result).toEqual({ id: 9, type: 'RECURRING' })
  })

  it('returns 404 when the chore does not exist', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 999, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 404 when a RECURRING occurrence has no chore', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({
      ...pendingAssignment,
      id: 9,
      chore: null,
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Mom' })
    await expect(nudgeService.nudge({ id: 9, type: 'RECURRING', parentId: 2 })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 409 when the chore is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...pendingAssignment, status: 'COMPLETED' })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('returns 400 when the assignee has no ntfyTopic', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 400 })
    expect(sendNtfy).not.toHaveBeenCalled()
  })

  it('returns 429 when nudged within the last 15 minutes', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - 5 * 60 * 1000),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 429 })
    expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
  })

  it('returns 429 when nudged at the 14:59 boundary', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - (COOLDOWN_MS - 1000)),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 429 })
    expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
  })

  it('allows a nudge at the 15:01 boundary (pre-read passes, updateMany wins)', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - (COOLDOWN_MS + 1000)),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 1 })

    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).resolves.toEqual({ id: 5, type: 'REGULAR' })
  })

  it('allows a nudge once 15 minutes have elapsed', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - 16 * 60 * 1000),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 1 })

    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).resolves.toEqual({ id: 5, type: 'REGULAR' })
  })

  it('returns 429 when the atomic cooldown write matched nothing (concurrent nudge)', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - 16 * 60 * 1000),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    prisma.choreAssignment.updateMany.mockResolvedValue({ count: 0 })

    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 429 })
    expect(sendNtfy).not.toHaveBeenCalled()
  })
})
