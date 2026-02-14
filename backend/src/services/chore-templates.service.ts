import prisma from '../config/database.js'

export interface CreateTemplateData {
  title: string
  description?: string
  points: number
  icon?: string
  color?: string
  categoryId?: number
}

export interface UpdateTemplateData {
  title?: string
  description?: string
  points?: number
  icon?: string
  color?: string
  categoryId?: number
}

export interface TemplateWithCreator {
  id: number
  title: string
  description: string | null
  points: number
  icon: string | null
  color: string | null
  categoryId: number | null
  category: {
    id: number
    name: string
  } | null
  createdById: number
  createdBy: {
    id: number
    name: string
  }
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
  }
}

/**
 * Get all chore templates
 */
export const getAllTemplates = async (): Promise<TemplateWithCreator[]> => {
  const templates = await prisma.choreTemplate.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          assignments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return templates as TemplateWithCreator[]
}

/**
 * Get template by ID
 */
export const getTemplateById = async (templateId: number): Promise<TemplateWithCreator | null> => {
  const template = await prisma.choreTemplate.findUnique({
    where: { id: templateId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  })

  return template as TemplateWithCreator | null
}

/**
 * Create a new chore template
 */
export const createTemplate = async (
  data: CreateTemplateData,
  userId: number
): Promise<TemplateWithCreator> => {
  const template = await prisma.choreTemplate.create({
    data: {
      title: data.title,
      description: data.description,
      points: data.points,
      icon: data.icon,
      color: data.color,
      categoryId: data.categoryId,
      createdById: userId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return template as TemplateWithCreator
}

/**
 * Update a chore template
 */
export const updateTemplate = async (
  templateId: number,
  data: UpdateTemplateData
): Promise<TemplateWithCreator> => {
  // Build update data - exclude undefined values
  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.points !== undefined) updateData.points = data.points
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.color !== undefined) updateData.color = data.color
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId

  const template = await prisma.choreTemplate.update({
    where: { id: templateId },
    data: updateData,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return template as TemplateWithCreator
}

/**
 * Delete a chore template
 */
export const deleteTemplate = async (templateId: number): Promise<void> => {
  await prisma.choreTemplate.delete({
    where: { id: templateId },
  })
}
