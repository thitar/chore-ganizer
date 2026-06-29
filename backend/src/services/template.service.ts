import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export async function create(data: {
  title: string
  description?: string
  points: number
  category: string
  createdById: number
}) {
  return prisma.choreTemplate.create({ data })
}

export async function getAll() {
  return prisma.choreTemplate.findMany({ orderBy: { title: 'asc' } })
}

export async function update(
  id: number,
  data: { title?: string; description?: string; points?: number; category?: string }
) {
  try {
    return await prisma.choreTemplate.update({ where: { id }, data })
  } catch (err: unknown) {
    if (isRecordNotFoundError(err)) {
      throw new AppError('Template not found', 404)
    }
    throw err
  }
}

export async function delete_(id: number) {
  const completedAssignments = await prisma.choreAssignment.findMany({
    where: { choreTemplateId: id, status: 'COMPLETED' },
  })

  if (completedAssignments.length > 0) {
    throw new AppError(
      'Cannot delete template with completed assignments. Uncomplete them first.',
      409
    )
  }

  try {
    await prisma.$transaction([
      prisma.choreAssignment.deleteMany({
        where: { choreTemplateId: id, status: 'PENDING' },
      }),
      prisma.choreTemplate.delete({ where: { id } }),
    ])
    return { deleted: true }
  } catch (err: unknown) {
    if (isRecordNotFoundError(err)) {
      throw new AppError('Template not found', 404)
    }
    throw err
  }
}

function isRecordNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2025'
  )
}
