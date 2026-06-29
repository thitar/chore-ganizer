import { Request, Response } from 'express'
import * as templatesService from '../services/chore-templates.service.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * GET /api/chore-templates
 * Get all chore templates
 */
export const getTemplates = async (_req: Request, res: Response) => {
  const templates = await templatesService.getAllTemplates()

  res.json({
    success: true,
    data: { templates },
  })
}

/**
 * GET /api/chore-templates/:id
 * Get a single chore template
 */
export const getTemplate = async (req: Request, res: Response) => {
  const templateId = Number(req.params.id)

  if (isNaN(templateId)) {
    throw new AppError('Invalid template ID', 400, 'VALIDATION_ERROR')
  }

  const template = await templatesService.getTemplateById(templateId)

  if (!template) {
    throw new AppError('Template not found', 404, 'NOT_FOUND')
  }

  res.json({
    success: true,
    data: { template },
  })
}

/**
 * POST /api/chore-templates
 * Create a new chore template (parents only)
 */
export const createTemplate = async (req: Request, res: Response) => {
  const { title, description, points, icon, color } = req.body

  if (!title || points === undefined) {
    throw new AppError('Title and points are required', 400, 'VALIDATION_ERROR')
  }

  if (typeof points !== 'number' || points < 0) {
    throw new AppError('Points must be a non-negative number', 400, 'VALIDATION_ERROR')
  }

  const template = await templatesService.createTemplate(
    { title, description, points, icon, color },
    req.user!.id
  )

  res.status(201).json({
    success: true,
    data: { template },
  })
}

/**
 * PUT /api/chore-templates/:id
 * Update a chore template
 */
export const updateTemplate = async (req: Request, res: Response) => {
  const templateId = Number(req.params.id)

  if (isNaN(templateId)) {
    throw new AppError('Invalid template ID', 400, 'VALIDATION_ERROR')
  }

  const { title, description, points, icon, color } = req.body

  // Check template exists
  const existing = await templatesService.getTemplateById(templateId)
  if (!existing) {
    throw new AppError('Template not found', 404, 'NOT_FOUND')
  }

  const template = await templatesService.updateTemplate(templateId, {
    title,
    description,
    points,
    icon,
    color,
  })

  res.json({
    success: true,
    data: { template },
  })
}

/**
 * DELETE /api/chore-templates/:id
 * Delete a chore template
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  const templateId = Number(req.params.id)

  if (isNaN(templateId)) {
    throw new AppError('Invalid template ID', 400, 'VALIDATION_ERROR')
  }

  // Check template exists
  const existing = await templatesService.getTemplateById(templateId)
  if (!existing) {
    throw new AppError('Template not found', 404, 'NOT_FOUND')
  }

  await templatesService.deleteTemplate(templateId)

  res.json({
    success: true,
    data: { message: 'Template deleted successfully' },
  })
}
