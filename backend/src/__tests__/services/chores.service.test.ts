import * as choresService from '../../services/chores.service'
import prisma from '../../config/database'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    chore: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('Chores Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllChores', () => {
    it('should return all chores', async () => {
      const mockChores = [
        {
          id: 1,
          title: 'Clean room',
          description: 'Clean your room',
          points: 10,
          status: 'PENDING',
          assignedToId: 1,
          assignedTo: { id: 1, name: 'John' },
          createdAt: new Date(),
          completedAt: null,
        },
      ]
      ;(prisma.chore.findMany as jest.Mock).mockResolvedValue(mockChores)

      const result = await choresService.getAllChores()

      expect(result).toEqual(mockChores)
      expect(prisma.chore.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should filter by status', async () => {
      const mockChores = [
        {
          id: 1,
          title: 'Clean room',
          description: 'Clean your room',
          points: 10,
          status: 'COMPLETED',
          assignedToId: 1,
          assignedTo: { id: 1, name: 'John' },
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ]
      ;(prisma.chore.findMany as jest.Mock).mockResolvedValue(mockChores)

      const result = await choresService.getAllChores({ status: 'completed' })

      expect(result).toEqual(mockChores)
      expect(prisma.chore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'COMPLETED' },
        })
      )
    })

    it('should filter by assignedToId', async () => {
      const mockChores = [
        {
          id: 1,
          title: 'Clean room',
          description: 'Clean your room',
          points: 10,
          status: 'PENDING',
          assignedToId: 2,
          assignedTo: { id: 2, name: 'Jane' },
          createdAt: new Date(),
          completedAt: null,
        },
      ]
      ;(prisma.chore.findMany as jest.Mock).mockResolvedValue(mockChores)

      const result = await choresService.getAllChores({ assignedToId: 2 })

      expect(result).toEqual(mockChores)
      expect(prisma.chore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: 2 },
        })
      )
    })
  })

  describe('getChoreById', () => {
    it('should return chore by ID', async () => {
      const mockChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'PENDING',
        assignedToId: 1,
        assignedTo: { id: 1, name: 'John' },
        createdAt: new Date(),
        completedAt: null,
      }
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(mockChore)

      const result = await choresService.getChoreById(1)

      expect(result).toEqual(mockChore)
      expect(prisma.chore.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should throw error if chore not found', async () => {
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(choresService.getChoreById(999)).rejects.toThrow('Chore not found')
    })
  })

  describe('createChore', () => {
    it('should create a new chore', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'John', role: 'CHILD', points: 0 }
      const mockChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'PENDING',
        assignedToId: 1,
        assignedTo: { id: 1, name: 'John' },
        createdAt: new Date(),
        completedAt: null,
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.chore.create as jest.Mock).mockResolvedValue(mockChore)

      const result = await choresService.createChore({
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        assignedToId: 1,
      })

      expect(result).toEqual(mockChore)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
      expect(prisma.chore.create).toHaveBeenCalled()
    })

    it('should throw error if assigned user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        choresService.createChore({
          title: 'Clean room',
          points: 10,
          assignedToId: 999,
        })
      ).rejects.toThrow('Assigned user not found')
    })
  })

  describe('updateChore', () => {
    it('should update an existing chore', async () => {
      const existingChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'PENDING',
        assignedToId: 1,
      }
      const updatedChore = {
        id: 1,
        title: 'Clean room updated',
        description: 'Clean your room updated',
        points: 15,
        status: 'PENDING',
        assignedToId: 1,
        assignedTo: { id: 1, name: 'John' },
        createdAt: new Date(),
        completedAt: null,
      }
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(existingChore)
      ;(prisma.chore.update as jest.Mock).mockResolvedValue(updatedChore)

      const result = await choresService.updateChore(1, {
        title: 'Clean room updated',
        description: 'Clean your room updated',
        points: 15,
      })

      expect(result).toEqual(updatedChore)
      expect(prisma.chore.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: 'Clean room updated',
          description: 'Clean your room updated',
          points: 15,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should throw error if chore not found', async () => {
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        choresService.updateChore(999, { title: 'Updated' })
      ).rejects.toThrow('Chore not found')
    })
  })

  describe('deleteChore', () => {
    it('should delete a chore', async () => {
      const existingChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'PENDING',
        assignedToId: 1,
      }
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(existingChore)
      ;(prisma.chore.delete as jest.Mock).mockResolvedValue({})

      await choresService.deleteChore(1)

      expect(prisma.chore.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should throw error if chore not found', async () => {
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(choresService.deleteChore(999)).rejects.toThrow('Chore not found')
    })
  })

  describe('completeChore', () => {
    it('should complete a chore and award points', async () => {
      const mockChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'PENDING',
        assignedToId: 1,
      }
      const updatedChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'COMPLETED',
        assignedToId: 1,
        assignedTo: { id: 1, name: 'John' },
        createdAt: new Date(),
        completedAt: new Date(),
      }
      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        role: 'CHILD',
        points: 10,
      }
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(mockChore)
      ;(prisma.chore.update as jest.Mock).mockResolvedValue(updatedChore)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await choresService.completeChore(1, 1)

      expect(result).toEqual({
        chore: updatedChore,
        pointsAwarded: 10,
        userPoints: 10,
      })
      expect(prisma.chore.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          points: {
            increment: 10,
          },
        },
      })
    })

    it('should throw error if chore not found', async () => {
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(choresService.completeChore(999, 1)).rejects.toThrow('Chore not found')
    })

    it('should throw error if chore already completed', async () => {
      const mockChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'COMPLETED',
        assignedToId: 1,
      }
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(mockChore)

      await expect(choresService.completeChore(1, 1)).rejects.toThrow('Chore is already completed')
    })

    it('should throw error if user not assigned to chore', async () => {
      const mockChore = {
        id: 1,
        title: 'Clean room',
        description: 'Clean your room',
        points: 10,
        status: 'PENDING',
        assignedToId: 2,
      }
      ;(prisma.chore.findUnique as jest.Mock).mockResolvedValue(mockChore)

      await expect(choresService.completeChore(1, 1)).rejects.toThrow('You can only complete your assigned chores')
    })
  })
})
