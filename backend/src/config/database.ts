import { PrismaClient } from '@prisma/client'

// Create a singleton Prisma client instance
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Middleware: auto-serialize/deserialize recurrenceRule for SQLite
// SQLite does not support Prisma's native Json type, so store as String
// and transform at the client boundary
prisma.$use(async (params, next) => {
  if (params.model === 'RecurringChore') {
    if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(params.action)) {
      const data = params.args.data
      if (data) {
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item?.recurrenceRule && typeof item.recurrenceRule === 'object') {
            item.recurrenceRule = JSON.stringify(item.recurrenceRule)
          }
        }
      }
      if (params.action === 'upsert') {
        for (const key of ['create', 'update'] as const) {
          const sub = (params.args as any)[key]
          if (sub?.recurrenceRule && typeof sub.recurrenceRule === 'object') {
            sub.recurrenceRule = JSON.stringify(sub.recurrenceRule)
          }
        }
      }
    }
  }
  const result = await next(params)
  if (params.model === 'RecurringChore' && result) {
    const items = Array.isArray(result) ? result : [result]
    for (const item of items) {
      if (item?.recurrenceRule && typeof item.recurrenceRule === 'string') {
        item.recurrenceRule = JSON.parse(item.recurrenceRule)
      }
    }
  }
  return result
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
