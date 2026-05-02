import { createMockRequest, createMockResponse, mockTemplates } from '../test-helpers'
import { Request, Response } from 'express'

jest.mock('../../services/chore-templates.service', () => ({
  getAllTemplates: jest.fn(),
  getTemplateById: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
}))

import * as templatesService from '../../services/chore-templates.service'
import { getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from '../../controllers/chore-templates.controller'
import { AppError } from '../../middleware/errorHandler'

describe('Chore Templates Controller', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  describe('getTemplates', () => {
    it('should return 200 with templates on success', async () => {
      const templates = [mockTemplates.dishes, mockTemplates.cleaning]
      ;(templatesService.getAllTemplates as jest.Mock).mockResolvedValue(templates)

      await getTemplates(mockReq as Request, mockRes as Response)

      expect(templatesService.getAllTemplates).toHaveBeenCalledWith()
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { templates },
      })
    })

    it('should propagate service errors', async () => {
      ;(templatesService.getAllTemplates as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      await expect(
        getTemplates(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('getTemplate', () => {
    it('should return 200 with template on success', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await getTemplate(mockReq as Request, mockRes as Response)

      expect(templatesService.getTemplateById).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { template: mockTemplates.dishes },
      })
    })

    it('should throw 400 for invalid template ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        getTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if template not found', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        getTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        getTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('createTemplate', () => {
    it('should return 201 with created template on success', async () => {
      const newTemplate = { id: 3, title: 'New Chore', points: 10, createdById: 1 }
      ;(templatesService.createTemplate as jest.Mock).mockResolvedValue(newTemplate)

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { title: 'New Chore', points: 10, icon: '⭐' },
      })

      await createTemplate(mockReq as Request, mockRes as Response)

      expect(templatesService.createTemplate).toHaveBeenCalledWith(
        { title: 'New Chore', description: undefined, points: 10, icon: '⭐', color: undefined },
        1
      )
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { template: newTemplate },
      })
    })

    it('should throw 400 if title or points are missing', async () => {
      mockReq = createMockRequest({
        body: { icon: '⭐' },
      })

      await expect(
        createTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 if points is negative', async () => {
      mockReq = createMockRequest({
        body: { title: 'Bad Chore', points: -5 },
      })

      await expect(
        createTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 400 if points is not a number', async () => {
      mockReq = createMockRequest({
        body: { title: 'Bad Chore', points: 'abc' },
      })

      await expect(
        createTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(templatesService.createTemplate as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        user: { id: 1, role: 'PARENT' } as any,
        body: { title: 'New Chore', points: 10 },
      })

      await expect(
        createTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('updateTemplate', () => {
    it('should return 200 with updated template on success', async () => {
      const updatedTemplate = { ...mockTemplates.dishes, title: 'Updated Chore' }
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)
      ;(templatesService.updateTemplate as jest.Mock).mockResolvedValue(updatedTemplate)

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { title: 'Updated Chore', points: 15 },
      })

      await updateTemplate(mockReq as Request, mockRes as Response)

      expect(templatesService.updateTemplate).toHaveBeenCalledWith(1, {
        title: 'Updated Chore',
        description: undefined,
        points: 15,
        icon: undefined,
        color: undefined,
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { template: updatedTemplate },
      })
    })

    it('should throw 400 for invalid template ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
        body: { title: 'Updated' },
      })

      await expect(
        updateTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if template not found', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
        body: { title: 'Updated' },
      })

      await expect(
        updateTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)
      ;(templatesService.updateTemplate as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
        body: { title: 'Updated' },
      })

      await expect(
        updateTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })

  describe('deleteTemplate', () => {
    it('should return 200 with success message on deletion', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)
      ;(templatesService.deleteTemplate as jest.Mock).mockResolvedValue(undefined)

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await deleteTemplate(mockReq as Request, mockRes as Response)

      expect(templatesService.deleteTemplate).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Template deleted successfully' },
      })
    })

    it('should throw 400 for invalid template ID', async () => {
      mockReq = createMockRequest({
        params: { id: 'invalid' },
      })

      await expect(
        deleteTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should throw 404 if template not found', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(null)

      mockReq = createMockRequest({
        params: { id: '999' },
      })

      await expect(
        deleteTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError)
    })

    it('should propagate service errors', async () => {
      ;(templatesService.getTemplateById as jest.Mock).mockResolvedValue(mockTemplates.dishes)
      ;(templatesService.deleteTemplate as jest.Mock).mockRejectedValue(
        new Error('DB error')
      )

      mockReq = createMockRequest({
        params: { id: '1' },
      })

      await expect(
        deleteTemplate(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('DB error')
    })
  })
})
