import { z } from 'zod'

export const createRecurringSchema = z.object({
  choreTemplateId: z.number().int().positive('Template ID is required'),
  assignedToId: z.number().int().positive('Assignee is required'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
})
