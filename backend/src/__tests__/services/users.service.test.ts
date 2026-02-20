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
      update: jest.fn(),
    },
    choreAssignment: {
      findMany: jest.fn(),
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
})
