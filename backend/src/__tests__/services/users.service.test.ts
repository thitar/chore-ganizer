jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pointLog: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    choreAssignment: {
      count: jest.fn(),
    },
    recurringChore: {
      count: jest.fn(),
    },
  },
}))

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

const { prisma } = require('../../config/prisma')
const bcrypt = require('bcrypt')
const { AppError } = require('../../middleware/errorHandler')

let usersService: typeof import('../../services/users.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/users.service')]
  usersService = require('../../services/users.service')
})

describe('usersService.createUser', () => {
  it('creates user with hashed password', async () => {
    prisma.user.findUnique.mockResolvedValue(null) // email not taken
    bcrypt.hash.mockResolvedValue('hashed_password')
    prisma.user.create.mockResolvedValue({
      id: 5, name: 'Test', email: 'test@home.local', role: 'CHILD', color: '#3B82F6',
    })

    const result = await usersService.createUser({
      name: 'Test', email: 'test@home.local', password: 'password123', role: 'CHILD', color: '#3B82F6',
    })

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Test',
        email: 'test@home.local',
        password: 'hashed_password',
        role: 'CHILD',
        color: '#3B82F6',
      },
      select: { id: true, name: true, email: true, role: true, color: true },
    })
    expect(result.email).toBe('test@home.local')
  })

  it('throws 409 if email already taken', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'taken@home.local' })
    await expect(
      usersService.createUser({ name: 'X', email: 'taken@home.local', password: 'password123', role: 'CHILD', color: '#000000' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 400 on invalid email', async () => {
    await expect(
      usersService.createUser({ name: 'X', email: 'not-an-email', password: 'password123', role: 'CHILD', color: '#000' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 on short password', async () => {
    await expect(
      usersService.createUser({ name: 'X', email: 'new@home.local', password: '12345', role: 'CHILD', color: '#000' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 on invalid color', async () => {
    await expect(
      usersService.createUser({ name: 'X', email: 'new@home.local', password: 'password123', role: 'CHILD', color: 'red' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 on short color (3 hex chars)', async () => {
    await expect(
      usersService.createUser({ name: 'X', email: 'new@home.local', password: 'password123', role: 'CHILD', color: '#000' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('usersService.deleteUser', () => {
  it('deletes user with no FK references', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, name: 'X' })
    prisma.choreAssignment.count.mockResolvedValue(0)
    prisma.pointLog.count.mockResolvedValue(0)
    prisma.recurringChore.count.mockResolvedValue(0)
    prisma.user.delete.mockResolvedValue({ id: 5 })

    const result = await usersService.deleteUser(5, 1)

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 5 } })
    expect(result).toEqual({ deleted: true })
  })

  it('throws 409 when user has chore assignments (AUTH-04 regression)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, name: 'X' })
    prisma.choreAssignment.count.mockResolvedValue(3)
    prisma.pointLog.count.mockResolvedValue(0)
    prisma.recurringChore.count.mockResolvedValue(0)

    await expect(usersService.deleteUser(5, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringMatching(/3 assignment/i),
    })
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('throws 409 with combined message when user has multiple data types', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, name: 'X' })
    prisma.choreAssignment.count.mockResolvedValue(2)
    prisma.pointLog.count.mockResolvedValue(1)
    prisma.recurringChore.count.mockResolvedValueOnce(1)
    prisma.recurringChore.count.mockResolvedValueOnce(0)

    await expect(usersService.deleteUser(5, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringMatching(/2 assignments.*1 point log.*1 recurring chore/i),
    })
  })

  it('throws 400 on self-delete', async () => {
    await expect(usersService.deleteUser(1, 1)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 if user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(usersService.deleteUser(999, 1)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('usersService.updatePassword', () => {
  it('updates password when current is correct', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, password: 'hashed_old' })
    bcrypt.compare.mockResolvedValue(true)
    bcrypt.hash.mockResolvedValue('hashed_new')
    prisma.user.update.mockResolvedValue({ id: 1 })

    const result = await usersService.updatePassword(1, 'oldpass', 'newpass1')

    expect(bcrypt.compare).toHaveBeenCalledWith('oldpass', 'hashed_old')
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass1', 10)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { password: 'hashed_new' },
    })
    expect(result).toEqual({ updated: true })
  })

  it('throws 401 on wrong current password', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, password: 'hashed_old' })
    bcrypt.compare.mockResolvedValue(false)

    await expect(usersService.updatePassword(1, 'wrong', 'newpass1')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 400 on short new password', async () => {
    await expect(usersService.updatePassword(1, 'old', '12345')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 if user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(usersService.updatePassword(999, 'old', 'newpass1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('usersService.updateColor', () => {
  it('updates color', async () => {
    prisma.user.update.mockResolvedValue({ id: 1, color: '#FF0000' })

    const result = await usersService.updateColor(1, '#FF0000')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { color: '#FF0000' },
      select: { id: true, name: true, email: true, role: true, color: true },
    })
    expect(result.color).toBe('#FF0000')
  })

  it('throws 400 on invalid hex', async () => {
    await expect(usersService.updateColor(1, 'red')).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('usersService.updateNtfyTopic', () => {
  it('updates ntfyTopic with valid topic', async () => {
    prisma.user.findFirst.mockResolvedValue(null) // no conflict
    prisma.user.update.mockResolvedValue({ id: 1, name: 'Alice', email: 'alice@home.local', role: 'CHILD', color: '#3B82F6', ntfyTopic: 'chore-alice-a1b2c3' })

    const result = await usersService.updateNtfyTopic(1, 'chore-alice-a1b2c3')

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { ntfyTopic: 'chore-alice-a1b2c3', id: { not: 1 } },
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ntfyTopic: 'chore-alice-a1b2c3' },
      select: { id: true, name: true, email: true, role: true, color: true, ntfyTopic: true },
    })
    expect(result.ntfyTopic).toBe('chore-alice-a1b2c3')
  })

  it('clears ntfyTopic when null passed', async () => {
    prisma.user.update.mockResolvedValue({ id: 1, name: 'Alice', email: 'alice@home.local', role: 'CHILD', color: '#3B82F6', ntfyTopic: null })

    const result = await usersService.updateNtfyTopic(1, null)

    expect(prisma.user.findFirst).not.toHaveBeenCalled()
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ntfyTopic: null },
      select: { id: true, name: true, email: true, role: true, color: true, ntfyTopic: true },
    })
    expect(result.ntfyTopic).toBeNull()
  })

  it('clears ntfyTopic when empty string passed', async () => {
    prisma.user.update.mockResolvedValue({ id: 1, name: 'Alice', email: 'alice@home.local', role: 'CHILD', color: '#3B82F6', ntfyTopic: null })

    const result = await usersService.updateNtfyTopic(1, '')

    expect(prisma.user.findFirst).not.toHaveBeenCalled()
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ntfyTopic: null },
      select: { id: true, name: true, email: true, role: true, color: true, ntfyTopic: true },
    })
    expect(result.ntfyTopic).toBeNull()
  })

  it('throws 400 on topic too short (< 12 chars)', async () => {
    await expect(usersService.updateNtfyTopic(1, 'short')).rejects.toMatchObject({ statusCode: 400 })
    expect(prisma.user.findFirst).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('throws 400 on topic with invalid characters (spaces, special chars)', async () => {
    await expect(usersService.updateNtfyTopic(1, 'has spaces!')).rejects.toMatchObject({ statusCode: 400 })
    expect(prisma.user.findFirst).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('throws 409 when topic already taken by another user', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 2, ntfyTopic: 'chore-bob-x1y2z3' })

    await expect(usersService.updateNtfyTopic(1, 'chore-bob-x1y2z3')).rejects.toMatchObject({ statusCode: 409 })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('succeeds when topic is already owned by same user (no self-conflict)', async () => {
    prisma.user.findFirst.mockResolvedValue(null) // no other user has it
    prisma.user.update.mockResolvedValue({ id: 1, name: 'Alice', email: 'alice@home.local', role: 'CHILD', color: '#3B82F6', ntfyTopic: 'chore-alice-a1b2c3' })

    const result = await usersService.updateNtfyTopic(1, 'chore-alice-a1b2c3')

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { ntfyTopic: 'chore-alice-a1b2c3', id: { not: 1 } },
    })
    expect(result.ntfyTopic).toBe('chore-alice-a1b2c3')
  })

  it('throws 400 on topic too long (> 64 chars)', async () => {
    const longTopic = 'a'.repeat(65)
    await expect(usersService.updateNtfyTopic(1, longTopic)).rejects.toMatchObject({ statusCode: 400 })
    expect(prisma.user.findFirst).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
