/**
 * Chore Categories Service Tests
 *
 * Covers:
 * - getAllCategories: caching, returns categories with template counts
 * - getCategoryById: returns single category, null handling
 * - createCategory: creates with name, icon, color defaults
 * - updateCategory: partial update
 * - deleteCategory: delete with cache invalidation
 * - getTemplatesByCategory: templates in category
 */

import * as categoriesService from '../../services/chore-categories.service'

// Mock cache
jest.mock('../../utils/cache', () => ({
  getFromCache: jest.fn().mockReturnValue(null),
  setInCache: jest.fn(),
  removeFromCache: jest.fn(),
  CACHE_KEYS: { CATEGORIES: 'categories' },
  CACHE_TTL: { MEDIUM: 300 },
}))

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    choreTemplate: {
      findMany: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'
import { getFromCache, setInCache, removeFromCache } from '../../utils/cache'

describe('Chore Categories Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllCategories', () => {
    const mockCategories = [
      {
        id: 1,
        name: 'Household',
        description: 'General household chores',
        icon: '🏠',
        color: '#3B82F6',
        _count: { templates: 3 },
      },
      {
        id: 2,
        name: 'Outdoor',
        description: 'Outdoor chores',
        icon: '🌳',
        color: '#10B981',
        _count: { templates: 1 },
      },
    ]

    it('should return all categories with template counts', async () => {
      ;(prisma.choreCategory.findMany as jest.Mock).mockResolvedValue(mockCategories)

      const result = await categoriesService.getAllCategories()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Household')
      expect(prisma.choreCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            _count: { select: { templates: true } },
          },
          orderBy: { name: 'asc' },
        })
      )
    })

    it('should return cached categories when available', async () => {
      ;(getFromCache as jest.Mock).mockReturnValueOnce(mockCategories)

      const result = await categoriesService.getAllCategories()

      expect(result).toEqual(mockCategories)
      expect(prisma.choreCategory.findMany).not.toHaveBeenCalled()
    })

    it('should cache results after fetching from DB', async () => {
      ;(prisma.choreCategory.findMany as jest.Mock).mockResolvedValue(mockCategories)
      ;(getFromCache as jest.Mock).mockReturnValueOnce(null)

      await categoriesService.getAllCategories()

      expect(setInCache).toHaveBeenCalledWith('categories', mockCategories, 300)
    })

    it('should return empty array when no categories exist', async () => {
      ;(prisma.choreCategory.findMany as jest.Mock).mockResolvedValue([])

      const result = await categoriesService.getAllCategories()

      expect(result).toEqual([])
    })
  })

  describe('getCategoryById', () => {
    it('should return category by id', async () => {
      const mockCategory = {
        id: 1,
        name: 'Household',
        description: 'General household chores',
        icon: '🏠',
        color: '#3B82F6',
        _count: { templates: 3 },
      }
      ;(prisma.choreCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory)

      const result = await categoriesService.getCategoryById(1)

      expect(result).toEqual(mockCategory)
      expect(prisma.choreCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { _count: { select: { templates: true } } },
      })
    })

    it('should return null when category not found', async () => {
      ;(prisma.choreCategory.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await categoriesService.getCategoryById(999)

      expect(result).toBeNull()
    })
  })

  describe('createCategory', () => {
    it('should create a category with name and defaults', async () => {
      const createdCategory = {
        id: 1,
        name: 'New Category',
        description: undefined,
        icon: undefined,
        color: undefined,
      }
      ;(prisma.choreCategory.create as jest.Mock).mockResolvedValue(createdCategory)

      const result = await categoriesService.createCategory({
        name: 'New Category',
      })

      expect(result).toEqual(createdCategory)
      expect(prisma.choreCategory.create).toHaveBeenCalledWith({
        data: { name: 'New Category', description: undefined, icon: undefined, color: undefined },
      })
    })

    it('should create a category with all optional fields', async () => {
      const createdCategory = {
        id: 2,
        name: 'Custom Category',
        description: 'Custom desc',
        icon: '⭐',
        color: '#FF0000',
      }
      ;(prisma.choreCategory.create as jest.Mock).mockResolvedValue(createdCategory)

      const result = await categoriesService.createCategory({
        name: 'Custom Category',
        description: 'Custom desc',
        icon: '⭐',
        color: '#FF0000',
      })

      expect(result).toEqual(createdCategory)
    })

    it('should invalidate cache after creating a category', async () => {
      ;(prisma.choreCategory.create as jest.Mock).mockResolvedValue({
        id: 1, name: 'Test',
      })

      await categoriesService.createCategory({ name: 'Test' })

      expect(removeFromCache).toHaveBeenCalledWith('categories')
    })
  })

  describe('updateCategory', () => {
    it('should update a category with partial data', async () => {
      const updatedCategory = {
        id: 1,
        name: 'Updated Name',
        description: 'Household chores',
        icon: '🏠',
        color: '#FF0000',
      }
      ;(prisma.choreCategory.update as jest.Mock).mockResolvedValue(updatedCategory)

      const result = await categoriesService.updateCategory(1, { name: 'Updated Name', color: '#FF0000' })

      expect(result.name).toBe('Updated Name')
      expect(prisma.choreCategory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name', description: undefined, icon: undefined, color: '#FF0000' },
      })
    })

    it('should invalidate cache after updating a category', async () => {
      ;(prisma.choreCategory.update as jest.Mock).mockResolvedValue({ id: 1 })

      await categoriesService.updateCategory(1, { name: 'Updated' })

      expect(removeFromCache).toHaveBeenCalledWith('categories')
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category by id', async () => {
      ;(prisma.choreCategory.delete as jest.Mock).mockResolvedValue({ id: 1 })

      await categoriesService.deleteCategory(1)

      expect(prisma.choreCategory.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should invalidate cache after deleting a category', async () => {
      ;(prisma.choreCategory.delete as jest.Mock).mockResolvedValue({ id: 1 })

      await categoriesService.deleteCategory(1)

      expect(removeFromCache).toHaveBeenCalledWith('categories')
    })
  })

  describe('getTemplatesByCategory', () => {
    it('should return templates for a category', async () => {
      const mockTemplates = [
        {
          id: 1,
          title: 'Wash Dishes',
          points: 10,
          categoryId: 1,
          createdBy: { id: 1, name: 'Parent' },
          category: { id: 1, name: 'Household' },
          _count: { assignments: 5 },
        },
      ]
      ;(prisma.choreTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates)

      const result = await categoriesService.getTemplatesByCategory(1)

      expect(result).toHaveLength(1)
      expect(prisma.choreTemplate.findMany).toHaveBeenCalledWith({
        where: { categoryId: 1 },
        include: expect.objectContaining({
          createdBy: { select: { id: true, name: true } },
          category: true,
        }),
        orderBy: { title: 'asc' },
      })
    })

    it('should return empty array when no templates in category', async () => {
      ;(prisma.choreTemplate.findMany as jest.Mock).mockResolvedValue([])

      const result = await categoriesService.getTemplatesByCategory(1)

      expect(result).toEqual([])
    })
  })
})
