import { createMockRequest, createMockResponse, mockUsers } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/users.service', () => ({
  getAllUsers: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  lockUser: jest.fn(),
  unlockUser: jest.fn(),
  getUserAssignments: jest.fn(),
  getParentCount: jest.fn(),
  userHasActiveAssignments: jest.fn(),
}))

jest.mock('../../services/audit.service', () => ({
  getAuditContext: jest.fn(),
  createAuditLog: jest.fn(),
}))

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
}))

import * as usersService from '../../services/users.service'
import * as auditService from '../../services/audit.service'
import * as bcrypt from 'bcrypt'
import {
  getAllUsers,
  updateMyProfile,
  createUser,
  getUserById,
  getUserAssignments,
  updateUser,
  deleteUser,
  lockUser,
  unlockUser,
} from '../../controllers/users.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Users Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auditService.getAuditContext as jest.Mock).mockReturnValue({
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    })
    ;(auditService.createAuditLog as jest.Mock).mockResolvedValue(undefined)
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getAllUsers', () => {
    it('should return 200 with users on success', async () => {
      const users = [mockUsers.parent, mockUsers.child]
      ;(usersService.getAllUsers as jest.Mock).mockResolvedValue(users)

      await getAllUsers(mockReq as Request, mockRes as Response)

      expect(usersService.getAllUsers).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { users },
      })
    })

    it('should propagate service errors', async () => {
      ;(usersService.getAllUsers as jest.Mock).mockRejectedValue(new Error('DB error'))

      await expect(
        getAllUsers(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('updateMyProfile', () => {
    it('should return 200 with updated user on success', async () => {
      const updatedUser = { ...mockUsers.parent, name: 'Updated Parent' }
      ;(usersService.updateUser as jest.Mock).mockResolvedValue(updatedUser)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { name: 'Updated Parent', color: '#FF0000' },
      })

      await updateMyProfile(mockReq as Request, mockRes as Response)

      expect(usersService.updateUser).toHaveBeenCalledWith(1, {
        name: 'Updated Parent',
        color: '#FF0000',
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: updatedUser },
      })
    })

    it('should propagate service errors', async () => {
      ;(usersService.updateUser as jest.Mock).mockRejectedValue(new Error('Update error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { name: 'Updated' },
      })

      await expect(
        updateMyProfile(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Update error')
    })
  })

  describe('createUser', () => {
    it('should return 201 with created user on success', async () => {
      const newUser = { id: 3, name: 'New Child', email: 'new@test.com', role: 'CHILD' }
      ;(usersService.getUserByEmail as jest.Mock).mockResolvedValue(null)
      ;(usersService.createUser as jest.Mock).mockResolvedValue(newUser)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: {
          email: 'new@test.com',
          password: 'password123',
          name: 'New Child',
          role: 'CHILD',
          color: '#00FF00',
          basePocketMoney: 5,
        },
      })

      await createUser(mockReq as Request, mockRes as Response)

      expect(usersService.getUserByEmail).toHaveBeenCalledWith('new@test.com')
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(usersService.createUser).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: '$2b$10$hashedpassword',
        name: 'New Child',
        role: 'CHILD',
        color: '#00FF00',
        basePocketMoney: 5,
      })
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: newUser },
      })
    })

    it('should throw 400 if email already exists', async () => {
      ;(usersService.getUserByEmail as jest.Mock).mockResolvedValue(mockUsers.parent)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: {
          email: 'parent@test.com',
          password: 'password123',
          name: 'Duplicate',
        },
      })

      await expect(
        createUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.getUserByEmail as jest.Mock).mockResolvedValue(null)
      ;(usersService.createUser as jest.Mock).mockRejectedValue(new Error('Create error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: {
          email: 'new@test.com',
          password: 'password123',
          name: 'New Child',
        },
      })

      await expect(
        createUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Create error')
    })
  })

  describe('getUserById', () => {
    it('should return 200 with user on success', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.parent)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await getUserById(mockReq as Request, mockRes as Response)

      expect(usersService.getUserById).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUsers.parent },
      })
    })

    it('should throw 400 for invalid user ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        getUserById(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.getUserById as jest.Mock).mockRejectedValue(new Error('Not found'))

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        getUserById(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Not found')
    })
  })

  describe('getUserAssignments', () => {
    it('should return 200 with assignments for parent', async () => {
      const assignments = [{ id: 1, title: 'Wash Dishes', status: 'PENDING' }]
      ;(usersService.getUserAssignments as jest.Mock).mockResolvedValue(assignments)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
        query: { status: 'pending' },
      })

      await getUserAssignments(mockReq as Request, mockRes as Response)

      expect(usersService.getUserAssignments).toHaveBeenCalledWith(2, 'pending')
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { assignments },
      })
    })

    it('should return 200 with own assignments for child', async () => {
      const assignments = [{ id: 1, title: 'Wash Dishes', status: 'PENDING' }]
      ;(usersService.getUserAssignments as jest.Mock).mockResolvedValue(assignments)

      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        params: { id: '2' },
      })

      await getUserAssignments(mockReq as Request, mockRes as Response)

      expect(usersService.getUserAssignments).toHaveBeenCalledWith(2, undefined)
    })

    it('should throw 403 if child tries to view another user assignments', async () => {
      mockReq = createMockRequest({
        user: { id: 2, role: 'CHILD' } as any,
        params: { id: '3' },
      })

      await expect(
        getUserAssignments(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for invalid user ID', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: 'invalid' },
      })

      await expect(
        getUserAssignments(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.getUserAssignments as jest.Mock).mockRejectedValue(
        new Error('Service error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await expect(
        getUserAssignments(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error')
    })
  })

  describe('updateUser', () => {
    it('should return 200 with updated user on success', async () => {
      const updatedUser = { ...mockUsers.parent, name: 'Updated' }
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.child)
      ;(usersService.updateUser as jest.Mock).mockResolvedValue(updatedUser)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { name: 'Updated', color: '#FF0000' },
      })

      await updateUser(mockReq as Request, mockRes as Response)

      expect(usersService.updateUser).toHaveBeenCalledWith(1, {
        name: 'Updated',
        role: undefined,
        color: '#FF0000',
        email: undefined,
        basePocketMoney: undefined,
      })
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: updatedUser },
      })
    })

    it('should throw 400 for invalid user ID', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: 'invalid' },
      })

      await expect(
        updateUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should prevent demoting the last parent', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue({ ...mockUsers.parent, role: 'PARENT' })
      ;(usersService.getParentCount as jest.Mock).mockResolvedValue(1)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '3' },
        body: { role: 'CHILD' },
      })

      await expect(
        updateUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.child)
      ;(usersService.updateUser as jest.Mock).mockRejectedValue(new Error('Update error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
        body: { name: 'Updated' },
      })

      await expect(
        updateUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Update error')
    })
  })

  describe('deleteUser', () => {
    it('should return 200 with success message on deletion', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.child)
      ;(usersService.getParentCount as jest.Mock).mockResolvedValue(2)
      ;(usersService.userHasActiveAssignments as jest.Mock).mockResolvedValue(false)
      ;(usersService.deleteUser as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await deleteUser(mockReq as Request, mockRes as Response)

      expect(usersService.deleteUser).toHaveBeenCalledWith(2)
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'User deleted successfully' },
      })
    })

    it('should throw 400 if trying to delete self', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await expect(
        deleteUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for invalid user ID', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: 'invalid' },
      })

      await expect(
        deleteUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should prevent deleting the last parent', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue({ ...mockUsers.parent, role: 'PARENT' })
      ;(usersService.getParentCount as jest.Mock).mockResolvedValue(1)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '3' },
      })

      await expect(
        deleteUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 if user has active assignments', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.child)
      ;(usersService.getParentCount as jest.Mock).mockResolvedValue(2)
      ;(usersService.userHasActiveAssignments as jest.Mock).mockResolvedValue(true)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await expect(
        deleteUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.getUserById as jest.Mock).mockResolvedValue(mockUsers.child)
      ;(usersService.getParentCount as jest.Mock).mockResolvedValue(2)
      ;(usersService.userHasActiveAssignments as jest.Mock).mockResolvedValue(false)
      ;(usersService.deleteUser as jest.Mock).mockRejectedValue(new Error('Delete error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await expect(
        deleteUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Delete error')
    })
  })

  describe('lockUser', () => {
    it('should return 200 with locked user on success', async () => {
      const lockedUser = { ...mockUsers.child, lockedAt: new Date() }
      ;(usersService.lockUser as jest.Mock).mockResolvedValue(lockedUser)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await lockUser(mockReq as Request, mockRes as Response)

      expect(usersService.lockUser).toHaveBeenCalledWith(2)
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: lockedUser },
      })
    })

    it('should throw 400 if trying to lock self', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '1' },
      })

      await expect(
        lockUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 for invalid user ID', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: 'invalid' },
      })

      await expect(
        lockUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.lockUser as jest.Mock).mockRejectedValue(new Error('Lock error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await expect(
        lockUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Lock error')
    })
  })

  describe('unlockUser', () => {
    it('should return 200 with unlocked user on success', async () => {
      const unlockedUser = { ...mockUsers.child, lockedAt: null }
      ;(usersService.unlockUser as jest.Mock).mockResolvedValue(unlockedUser)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await unlockUser(mockReq as Request, mockRes as Response)

      expect(usersService.unlockUser).toHaveBeenCalledWith(2)
      expect(auditService.createAuditLog).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: unlockedUser },
      })
    })

    it('should throw 400 for invalid user ID', async () => {
      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: 'invalid' },
      })

      await expect(
        unlockUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(usersService.unlockUser as jest.Mock).mockRejectedValue(new Error('Unlock error'))

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        params: { id: '2' },
      })

      await expect(
        unlockUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Unlock error')
    })
  })
})
