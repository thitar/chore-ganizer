import { z } from 'zod'

export const adjustPointsSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  amount: z.number().int('Amount must be an integer'),
  reason: z.string().min(1, 'Reason is required'),
})
