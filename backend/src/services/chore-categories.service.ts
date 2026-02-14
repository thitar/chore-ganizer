import prisma from '../config/database.js'

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

  return category
}

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: number) => {
  await prisma.choreCategory.delete({
    where: { id: categoryId },
  })
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
