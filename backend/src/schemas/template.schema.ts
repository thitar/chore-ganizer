import { z } from 'zod'

export const createTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  points: z.number().int().min(1, 'Points must be at least 1'),
  category: z.string().min(1, 'Category is required').max(100),
})

export const updateTemplateSchema = createTemplateSchema.partial()
