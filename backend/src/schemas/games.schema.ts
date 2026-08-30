import { z } from 'zod'

export const scoreSchema = z.object({
  score: z.number().int('Score must be an integer').min(0).max(1_000_000),
})
