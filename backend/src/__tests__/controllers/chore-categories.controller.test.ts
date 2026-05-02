import { createMockRequest, createMockResponse, mockCategories } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/chore-categories.service', () => ({
  getAllCategories: jest.fn(),
  getCategoryById: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getTemplatesByCategory: jest.fn(),
}))

import * as categoriesService from '../../services/chore-categories.service'
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory, getCategoryTemplates } from '../../controllers/chore-categories.controller'

describe('Chore Categories Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getCategories', () => {
    it('should return 200 with categories on success', async () => {
      const categories = [mockCategories.household, mockCategories.outdoor]
      ;(categoriesService.getAllCategories as jest.Mock).mockResolvedValue(categories)

      await getCategories(mockReq as Request, mockRes as Response)

      expect(categoriesService.getAllCategories).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { categories },
      })
    })

    it('should propagate service errors', async () => {
      ;(categoriesService.getAllCategories as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      await expect(
        getCategories(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('getCategory', () => {
    it('should return 200 with category on success', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await getCategory(mockReq as Request, mockRes as Response)

      expect(categoriesService.getCategoryById).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { category: mockCategories.household },
      })
    })

    it('should return 404 if category not found', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await getCategory(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
        },
      })
    })

    it('should propagate service errors', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        getCategory(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('createCategory', () => {
    it('should return 201 with created category on success', async () => {
      const newCategory = { id: 3, name: 'Pet Care', description: 'Pet chores', icon: '🐱', color: '#FF0000' }
      ;(categoriesService.createCategory as jest.Mock).mockResolvedValue(newCategory)

      mockReq = createMockRequest({
        body: { name: 'Pet Care', description: 'Pet chores', icon: '🐱', color: '#FF0000' },
      })

      await createCategory(mockReq as Request, mockRes as Response)

      expect(categoriesService.createCategory).toHaveBeenCalledWith({
        name: 'Pet Care',
        description: 'Pet chores',
        icon: '🐱',
        color: '#FF0000',
      })
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { category: newCategory },
      })
    })

    it('should return 400 if name is missing', async () => {
      mockReq = createMockRequest({
        body: { description: 'No name provided' },
      })

      await createCategory(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Category name is required',
          code: 'MISSING_NAME',
        },
      })
    })

    it('should propagate service errors', async () => {
      ;(categoriesService.createCategory as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        body: { name: 'Pet Care' },
      })

      await expect(
        createCategory(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('updateCategory', () => {
    it('should return 200 with updated category on success', async () => {
      const updatedCategory = { ...mockCategories.household, name: 'Updated Household' }
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)
      ;(categoriesService.updateCategory as jest.Mock).mockResolvedValue(updatedCategory)

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { name: 'Updated Household' },
      })

      await updateCategory(mockReq as Request, mockRes as Response)

      expect(categoriesService.updateCategory).toHaveBeenCalledWith(1, {
        name: 'Updated Household',
        description: undefined,
        icon: undefined,
        color: undefined,
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { category: updatedCategory },
      })
    })

    it('should return 404 if category not found', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
        body: { name: 'Updated' },
      })

      await updateCategory(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
        },
      })
    })

    it('should propagate service errors', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)
      ;(categoriesService.updateCategory as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { name: 'Updated' },
      })

      await expect(
        updateCategory(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('deleteCategory', () => {
    it('should return 200 with success message on deletion', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)
      ;(categoriesService.deleteCategory as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await deleteCategory(mockReq as Request, mockRes as Response)

      expect(categoriesService.deleteCategory).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Category deleted successfully',
      })
    })

    it('should return 404 if category not found', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await deleteCategory(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('should propagate service errors', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)
      ;(categoriesService.deleteCategory as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        deleteCategory(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('getCategoryTemplates', () => {
    it('should return 200 with templates on success', async () => {
      const templates = [{ id: 1, title: 'Wash Dishes' }]
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)
      ;(categoriesService.getTemplatesByCategory as jest.Mock).mockResolvedValue(templates)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await getCategoryTemplates(mockReq as Request, mockRes as Response)

      expect(categoriesService.getTemplatesByCategory).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { templates },
      })
    })

    it('should return 404 if category not found', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await getCategoryTemplates(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('should propagate service errors', async () => {
      ;(categoriesService.getCategoryById as jest.Mock).mockResolvedValue(mockCategories.household)
      ;(categoriesService.getTemplatesByCategory as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        getCategoryTemplates(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })
})
