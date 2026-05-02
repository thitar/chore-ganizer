/**
 * Chore Templates Service Tests
 *
 * Covers:
 * - getAllTemplates: caching, returns templates with category/creator includes
 * - getTemplateById: returns single template, null handling
 * - createTemplate: validates name, points, categoryId
 * - updateTemplate: partial update
 * - deleteTemplate: delete with cache invalidation
 */

import * as templatesService from '../../services/chore-templates.service'

// Mock cache
jest.mock('../../utils/cache', () => ({
  getFromCache: jest.fn().mockReturnValue(null),
  setInCache: jest.fn(),
  removeFromCache: jest.fn(),
  CACHE_KEYS: { CHORE_TEMPLATES: 'chore_templates' },
  CACHE_TTL: { MEDIUM: 300 },
}))

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    choreTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../../config/database'
import { getFromCache, setInCache, removeFromCache } from '../../utils/cache'

describe('Chore Templates Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllTemplates', () => {
    const mockTemplates = [
      {
        id: 1,
        title: 'Wash Dishes',
        description: 'Clean all dishes after dinner',
        points: 10,
        icon: '🍽️',
        color: '#3B82F6',
        categoryId: 1,
        createdById: 1,
        createdBy: { id: 1, name: 'Test Parent' },
        category: { id: 1, name: 'Household' },
        _count: { assignments: 5 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ]

    it('should return all templates with includes', async () => {
      ;(prisma.choreTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates)

      const result = await templatesService.getAllTemplates()

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Wash Dishes')
      expect(prisma.choreTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            createdBy: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            _count: { select: { assignments: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should cache results after fetching from DB', async () => {
      ;(prisma.choreTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates)

      await templatesService.getAllTemplates()

      expect(setInCache).toHaveBeenCalledWith('chore_templates', mockTemplates, 300)
    })

    it('should return cached templates when available', async () => {
      ;(getFromCache as jest.Mock).mockReturnValueOnce(mockTemplates)

      const result = await templatesService.getAllTemplates()

      expect(result).toEqual(mockTemplates)
      expect(prisma.choreTemplate.findMany).not.toHaveBeenCalled()
    })

    it('should return empty array when no templates exist', async () => {
      ;(prisma.choreTemplate.findMany as jest.Mock).mockResolvedValue([])

      const result = await templatesService.getAllTemplates()

      expect(result).toEqual([])
    })
  })

  describe('getTemplateById', () => {
    it('should return template by id', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Wash Dishes',
        points: 10,
        createdBy: { id: 1, name: 'Parent' },
        category: { id: 1, name: 'Household' },
        _count: { assignments: 3 },
      }
      ;(prisma.choreTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate)

      const result = await templatesService.getTemplateById(1)

      expect(result).toEqual(mockTemplate)
      expect(prisma.choreTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
      })
    })

    it('should return null when template not found', async () => {
      ;(prisma.choreTemplate.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await templatesService.getTemplateById(999)

      expect(result).toBeNull()
    })
  })

  describe('createTemplate', () => {
    it('should create a template with all fields', async () => {
      const createdTemplate = {
        id: 1,
        title: 'New Chore',
        description: 'Do the thing',
        points: 10,
        icon: '⭐',
        color: '#FF0000',
        categoryId: 1,
        createdById: 1,
        createdBy: { id: 1, name: 'Parent' },
        category: { id: 1, name: 'Household' },
      }
      ;(prisma.choreTemplate.create as jest.Mock).mockResolvedValue(createdTemplate)

      const result = await templatesService.createTemplate(
        {
          title: 'New Chore',
          description: 'Do the thing',
          points: 10,
          icon: '⭐',
          color: '#FF0000',
          categoryId: 1,
        },
        1
      )

      expect(result.title).toBe('New Chore')
      expect(prisma.choreTemplate.create).toHaveBeenCalledWith({
        data: {
          title: 'New Chore',
          description: 'Do the thing',
          points: 10,
          icon: '⭐',
          color: '#FF0000',
          categoryId: 1,
          createdById: 1,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      })
    })

    it('should invalidate cache after creating a template', async () => {
      ;(prisma.choreTemplate.create as jest.Mock).mockResolvedValue({
        id: 1,
        title: 'Test',
        points: 5,
        createdById: 1,
        createdBy: { id: 1, name: 'Parent' },
        category: null,
      })

      await templatesService.createTemplate({ title: 'Test', points: 5 }, 1)

      expect(removeFromCache).toHaveBeenCalledWith('chore_templates')
    })

    it('should create template without optional fields', async () => {
      const createdTemplate = {
        id: 1,
        title: 'Minimal Chore',
        points: 5,
        createdById: 1,
        createdBy: { id: 1, name: 'Parent' },
        category: null,
      }
      ;(prisma.choreTemplate.create as jest.Mock).mockResolvedValue(createdTemplate)

      const result = await templatesService.createTemplate(
        { title: 'Minimal Chore', points: 5 },
        1
      )

      expect(result.title).toBe('Minimal Chore')
      expect(prisma.choreTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Minimal Chore',
            points: 5,
            createdById: 1,
          }),
        })
      )
    })
  })

  describe('updateTemplate', () => {
    it('should update a template with partial data', async () => {
      const updatedTemplate = {
        id: 1,
        title: 'Updated Chore',
        points: 15,
        createdBy: { id: 1, name: 'Parent' },
        category: null,
      }
      ;(prisma.choreTemplate.update as jest.Mock).mockResolvedValue(updatedTemplate)

      const result = await templatesService.updateTemplate(1, { title: 'Updated Chore', points: 15 })

      expect(result.title).toBe('Updated Chore')
      expect(prisma.choreTemplate.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated Chore', points: 15 },
        include: {
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      })
    })

    it('should invalidate cache after updating', async () => {
      ;(prisma.choreTemplate.update as jest.Mock).mockResolvedValue({
        id: 1,
        title: 'Updated',
        points: 5,
        createdBy: { id: 1, name: 'Parent' },
        category: null,
      })

      await templatesService.updateTemplate(1, { title: 'Updated' })

      expect(removeFromCache).toHaveBeenCalledWith('chore_templates')
    })

    it('should only update fields that are provided', async () => {
      ;(prisma.choreTemplate.update as jest.Mock).mockResolvedValue({
        id: 1,
        title: 'Original',
        points: 5,
        createdBy: { id: 1, name: 'Parent' },
        category: null,
      })

      await templatesService.updateTemplate(1, { description: 'New description' })

      // Should not pass undefined fields
      const updateData = (prisma.choreTemplate.update as jest.Mock).mock.calls[0][0].data
      expect(updateData.description).toBe('New description')
      expect(updateData.title).toBeUndefined()
    })
  })

  describe('deleteTemplate', () => {
    it('should delete a template by id', async () => {
      ;(prisma.choreTemplate.delete as jest.Mock).mockResolvedValue({ id: 1 })

      await templatesService.deleteTemplate(1)

      expect(prisma.choreTemplate.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should invalidate cache after deleting', async () => {
      ;(prisma.choreTemplate.delete as jest.Mock).mockResolvedValue({ id: 1 })

      await templatesService.deleteTemplate(1)

      expect(removeFromCache).toHaveBeenCalledWith('chore_templates')
    })
  })
})
