import { Request, Response } from 'express'
import * as categoriesService from '../services/chore-categories.service.js'

/**
 * Get all categories
 */
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await categoriesService.getAllCategories()
  res.json({
    success: true,
    data: { categories },
  })
}

/**
 * Get category by ID
 */
export const getCategory = async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.id)
  const category = await categoriesService.getCategoryById(categoryId)

  if (!category) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
      },
    })
    return
  }

  res.json({
    success: true,
    data: { category },
  })
}

/**
 * Create a new category
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name, description, icon, color } = req.body

  if (!name) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Category name is required',
        code: 'MISSING_NAME',
      },
    })
    return
  }

  const category = await categoriesService.createCategory({
    name,
    description,
    icon,
    color,
  })

  res.status(201).json({
    success: true,
    data: { category },
  })
}

/**
 * Update a category
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.id)
  const { name, description, icon, color } = req.body

  const existing = await categoriesService.getCategoryById(categoryId)
  if (!existing) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
      },
    })
    return
  }

  const category = await categoriesService.updateCategory(categoryId, {
    name,
    description,
    icon,
    color,
  })

  res.json({
    success: true,
    data: { category },
  })
}

/**
 * Delete a category
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.id)

  const existing = await categoriesService.getCategoryById(categoryId)
  if (!existing) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
      },
    })
    return
  }

  await categoriesService.deleteCategory(categoryId)

  res.json({
    success: true,
    message: 'Category deleted successfully',
  })
}

/**
 * Get templates by category
 */
export const getCategoryTemplates = async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.id)

  const existing = await categoriesService.getCategoryById(categoryId)
  if (!existing) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
      },
    })
    return
  }

  const templates = await categoriesService.getTemplatesByCategory(categoryId)

  res.json({
    success: true,
    data: { templates },
  })
}
