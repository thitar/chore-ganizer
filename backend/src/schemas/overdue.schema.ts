import { z } from 'zod'

export const cancelOverdueSchema = z.object({
  id: z.number().int().positive('Chore ID is required'),
  type: z.enum(['REGULAR', 'RECURRING']),
  penalty: z.number().int().min(0, 'Penalty must be 0 or more').max(100000, 'Penalty is too large').optional(),
})

export const rescheduleOverdueSchema = z.object({
  id: z.number().int().positive('Chore ID is required'),
  type: z.literal('REGULAR'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid due date is required'),
})
