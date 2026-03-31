/**
 * Tests for Users Service
 * 
 * Tests cover:
 * - getAllUsers: Fetch all users
 * - getUserById: Fetch user by ID
 * - getUserAssignments: Fetch user's chore assignments
 * - updateUser: Update user details
 */

import * as usersService from '../../services/users.service'
import prisma from '../../config/database'
import { mockUsers, mockAssignments, mockTemplates } from '../test-helpers'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    choreAssignment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

describe('Users Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllUsers', () => {
    it('should return all users ordered by name', async () => {
      const mockUsersList = [
        mockUsers.child,
        mockUsers.parent,
      ]
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsersList)

      const result = await usersService.getAllUsers()

      expect(result).toEqual(mockUsersList)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          points: true,
          basePocketMoney: true,
          color: true,
          familyId: true,
          createdAt: true,
          failedLoginAttempts: true,
          lockoutUntil: true,
          lockedAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    })

    it('should return empty array when no users exist', async () => {
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      const result = await usersService.getAllUsers()

      expect(result).toEqual([])
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUsers.parent)

      const result = await usersService.getUserById(1)

      expect(result).toEqual(mockUsers.parent)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
        }),
      })
    })

    it('should throw error when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(usersService.getUserById(999)).rejects.toThrow('User not found')
    })
  })

  describe('getUserAssignments', () => {
    const mockAssignmentsWithDetails = [
      {
        ...mockAssignments.pending,
        choreTemplate: mockTemplates.dishes,
        assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
        assignedBy: { id: 1, name: 'Test Parent' },
      },
    ]

    it('should return all assignments when status is "all"', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      const result = await usersService.getUserAssignments(2, 'all')

      expect(result).toEqual(mockAssignmentsWithDetails)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: 2 },
        })
      )
    })

    it('should return only pending assignments', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      const result = await usersService.getUserAssignments(2, 'pending')

      expect(result).toEqual(mockAssignmentsWithDetails)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assignedToId: 2,
            status: 'PENDING',
          },
        })
      )
    })

    it('should return only completed assignments', async () => {
      const completedAssignments = [
        {
          ...mockAssignments.completed,
          choreTemplate: mockTemplates.dishes,
          assignedTo: { id: 2, name: 'Test Child', color: '#10B981' },
          assignedBy: { id: 1, name: 'Test Parent' },
        },
      ]
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(completedAssignments)

      const result = await usersService.getUserAssignments(2, 'completed')

      expect(result).toEqual(completedAssignments)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assignedToId: 2,
            status: 'COMPLETED',
          },
        })
      )
    })

    it('should return overdue assignments with correct filter', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([])

      await usersService.getUserAssignments(2, 'overdue')

      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assignedToId: 2,
            status: 'PENDING',
            dueDate: { lt: expect.any(Date) },
          },
        })
      )
    })

    it('should return all assignments when no status provided', async () => {
      ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignmentsWithDetails)

      const result = await usersService.getUserAssignments(2)

      expect(result).toEqual(mockAssignmentsWithDetails)
      expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: 2 },
        })
      )
    })
  })

  describe('updateUser', () => {
    it('should update user name', async () => {
      const updatedUser = { ...mockUsers.parent, name: 'Updated Name' }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await usersService.updateUser(1, { name: 'Updated Name' })

      expect(result).toEqual(updatedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
        }),
      })
    })

    it('should update user color', async () => {
      const updatedUser = { ...mockUsers.parent, color: '#FF0000' }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await usersService.updateUser(1, { color: '#FF0000' })

      expect(result).toEqual(updatedUser)
    })

    it('should update user role', async () => {
      const updatedUser = { ...mockUsers.child, role: 'PARENT' }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await usersService.updateUser(2, { role: 'PARENT' })

      expect(result).toEqual(updatedUser)
    })

    it('should update user basePocketMoney', async () => {
      const updatedUser = { ...mockUsers.child, basePocketMoney: 10.0 }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await usersService.updateUser(2, { basePocketMoney: 10.0 })

      expect(result).toEqual(updatedUser)
    })

    it('should throw error when updating to existing email', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUsers.child)

      await expect(
        usersService.updateUser(1, { email: 'child@test.com' })
      ).rejects.toThrow('Email is already taken')

      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should allow updating to same email', async () => {
      const updatedUser = { ...mockUsers.parent, name: 'Updated' }
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await usersService.updateUser(1, { name: 'Updated' })

      expect(result).toEqual(updatedUser)
    })

    it('should update multiple fields at once', async () => {
      const updatedUser = { 
        ...mockUsers.parent, 
        name: 'New Name',
        color: '#00FF00',
        basePocketMoney: 15.0,
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const result = await usersService.updateUser(1, { 
        name: 'New Name',
        color: '#00FF00',
        basePocketMoney: 15.0,
      })

      expect(result).toEqual(updatedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { 
          name: 'New Name',
          color: '#00FF00',
          basePocketMoney: 15.0,
        },
        select: expect.any(Object),
      })
    })
  })

  describe('createUser', () => {
    it('should create a new user with all fields', async () => {
      const newUser = {
        id: 3,
        email: 'newuser@test.com',
        name: 'New User',
        role: 'CHILD',
        points: 0,
        basePocketMoney: 5.0,
        color: '#FF0000',
        familyId: null,
        createdAt: new Date(),
      }
      ;(prisma.user.create as jest.Mock).mockResolvedValue(newUser)

      const result = await usersService.createUser({
        email: 'newuser@test.com',
        password: 'hashedpassword',
        name: 'New User',
        role: 'CHILD',
        color: '#FF0000',
        basePocketMoney: 5.0,
      })

      expect(result).toEqual(newUser)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@test.com',
          password: 'hashedpassword',
          name: 'New User',
          role: 'CHILD',
          color: '#FF0000',
          basePocketMoney: 5.0,
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          role: true,
          points: true,
          basePocketMoney: true,
          color: true,
          familyId: true,
          createdAt: true,
        }),
      })
    })

    it('should create user with default values', async () => {
      const newUser = {
        id: 3,
        email: 'newuser@test.com',
        name: 'New User',
        role: 'CHILD',
        points: 0,
        basePocketMoney: 0,
        color: '#3B82F6',
        familyId: null,
        createdAt: new Date(),
      }
      ;(prisma.user.create as jest.Mock).mockResolvedValue(newUser)

      const result = await usersService.createUser({
        email: 'newuser@test.com',
        password: 'hashedpassword',
        name: 'New User',
        role: 'CHILD',
        color: '#3B82F6',
        basePocketMoney: 0,
      })

      expect(result).toEqual(newUser)
    })
  })

  describe('getParentCount', () => {
    it('should return the correct count of parent users', async () => {
      ;(prisma.user.count as jest.Mock).mockResolvedValue(3)

      const result = await usersService.getParentCount()

      expect(result).toBe(3)
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: 'PARENT' },
      })
    })

    it('should return 0 when no parent users exist', async () => {
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)

      const result = await usersService.getParentCount()

      expect(result).toBe(0)
    })
  })

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      ;(prisma.user.delete as jest.Mock).mockResolvedValue(mockUsers.child)

      await usersService.deleteUser(2)

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 2 },
      })
    })
  })

  describe('userHasActiveAssignments', () => {
    it('should return true when user has active assignments', async () => {
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(5)

      const result = await usersService.userHasActiveAssignments(2)

      expect(result).toBe(true)
      expect(prisma.choreAssignment.count).toHaveBeenCalledWith({
        where: {
          assignedToId: 2,
          status: 'PENDING',
        },
      })
    })

    it('should return false when user has no active assignments', async () => {
      ;(prisma.choreAssignment.count as jest.Mock).mockResolvedValue(0)

      const result = await usersService.userHasActiveAssignments(2)

      expect(result).toBe(false)
    })
  })

  describe('lockUser', () => {
    it('should lock a user account', async () => {
      const lockedUser = {
        ...mockUsers.child,
        lockedAt: new Date(),
        failedLoginAttempts: 10,
        lockoutUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(lockedUser)

      const result = await usersService.lockUser(2)

      expect(result).toEqual(lockedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          lockedAt: expect.any(Date),
          failedLoginAttempts: 10,
          lockoutUntil: expect.any(Date),
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          lockedAt: true,
          failedLoginAttempts: true,
          lockoutUntil: true,
        }),
      })
    })
  })

  describe('unlockUser', () => {
    it('should unlock a user account', async () => {
      const unlockedUser = {
        ...mockUsers.child,
        lockedAt: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(unlockedUser)

      const result = await usersService.unlockUser(2)

      expect(result).toEqual(unlockedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          lockedAt: null,
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          lockedAt: true,
          failedLoginAttempts: true,
          lockoutUntil: true,
        }),
      })
    })
  })
})
