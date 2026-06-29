import * as authService from '../../services/auth.service'
import prisma from '../../config/database'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('login', () => {
    it('should return user if credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        points: 100,
        password: '$2b$10$hashedpassword', // Mock bcrypt hash
        createdAt: new Date(),
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      // Mock bcrypt.compare
      const bcrypt = require('bcrypt')
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'PARENT',
          points: 100,
          createdAt: mockUser.createdAt,
        },
      })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should throw error if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw error if password is invalid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        points: 100,
        password: '$2b$10$hashedpassword',
        createdAt: new Date(),
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      // Mock bcrypt.compare
      const bcrypt = require('bcrypt')
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false)

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        points: 100,
        createdAt: new Date(),
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.getUserById(1)

      expect(result).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'PARENT',
          points: 100,
          createdAt: mockUser.createdAt,
        },
      })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('should throw error if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(authService.getUserById(999)).rejects.toThrow('User not found')
    })
  })
})
