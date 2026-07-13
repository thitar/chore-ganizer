import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['PARENT', 'CHILD']),
  color: z.string().min(1, 'Color is required'),
})

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
})

export const updateColorSchema = z.object({
  color: z.string().min(1, 'Color is required'),
})

export const updateNtfyTopicSchema = z.object({
  ntfyTopic: z.string().nullable(),
})
