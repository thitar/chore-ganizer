import prisma from '../config/database.js'
import { getFromCache, setInCache, removeFromCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache.js'

export interface CreateCategoryData {
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  icon?: string
  color?: string
}

/**
 * Get all chore categories
 */
export const getAllCategories = async () => {
  // Check cache first
  const cachedCategories = getFromCache(CACHE_KEYS.CATEGORIES)
  if (cachedCategories) {
    return cachedCategories
  }

  const categories = await prisma.choreCategory.findMany({
    include: {
      _count: {
        select: {
          templates: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Cache the results
  setInCache(CACHE_KEYS.CATEGORIES, categories, CACHE_TTL.MEDIUM)

  return categories
}

/**
 * Get category by ID
 */
export const getCategoryById = async (categoryId: number) => {
  const category = await prisma.choreCategory.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: {
          templates: true,
        },
      },
    },
  })

  return category
}

/**
 * Create a new category
 */
export const createCategory = async (data: CreateCategoryData) => {
  const category = await prisma.choreCategory.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
    },
  })

  // Invalidate cache after creating a new category
  removeFromCache(CACHE_KEYS.CATEGORIES)

  return category
}

/**
 * Update a category
 */
export const updateCategory = async (categoryId: number, data: UpdateCategoryData) => {
  const category = await prisma.choreCategory.update({
    where: { id: categoryId },
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
    },
  })

  // Invalidate cache after updating a category
  removeFromCache(CACHE_KEYS.CATEGORIES)

  return category
}

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: number) => {
  await prisma.choreCategory.delete({
    where: { id: categoryId },
  })

  // Invalidate cache after deleting a category
  removeFromCache(CACHE_KEYS.CATEGORIES)
}

/**
 * Get templates by category
 */
export const getTemplatesByCategory = async (categoryId: number) => {
  const templates = await prisma.choreTemplate.findMany({
    where: { categoryId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      category: true,
      _count: {
        select: {
          assignments: true,
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  })

  return templates
}
