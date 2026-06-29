import { z } from 'zod'

export const createAssignmentSchema = z.object({
  choreTemplateId: z.number().int().positive('Template ID is required'),
  assignedToId: z.number().int().positive('Assignee is required'),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Valid due date is required'),
})

export const updateAssignmentSchema = z.object({
  assignedToId: z.number().int().positive('Assignee is required').optional(),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Valid due date is required').optional(),
})
