import { z } from 'zod'

// ============================================
// Password Schema with Strength Requirements
// ============================================

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  role: z.enum(['PARENT', 'CHILD']).optional().default('CHILD'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ============================================
// User Schemas
// ============================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  role: z.enum(['PARENT', 'CHILD']).optional().default('CHILD'),
})

// Helper to transform empty strings to undefined for optional fields
const optionalString = <T extends z.ZodTypeAny>(schema: T) => 
  z.preprocess(
    (val) => (val === '' ? undefined : val),
    schema.optional()
  )

export const updateUserSchema = z.object({
  name: optionalString(z.string().min(1, 'Name cannot be empty').max(100, 'Name must be 100 characters or less')),
  email: optionalString(z.string().email('Invalid email address')),
  color: optionalString(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')),
  basePocketMoney: z.number().min(0, 'Base pocket money must be at least 0').optional(),
})

// ============================================
// Chore Template Schemas
// ============================================

export const createChoreTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  points: z.number().int('Points must be an integer').min(0, 'Points must be at least 0').max(1000, 'Points cannot exceed 1000'),
  categoryId: z.number().int('Category ID must be an integer').positive('Category ID must be positive').optional().nullable(),
})

export const updateChoreTemplateSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
  points: z.number().int('Points must be an integer').min(0, 'Points must be at least 0').max(1000, 'Points cannot exceed 1000').optional(),
  categoryId: z.number().int('Category ID must be an integer').positive('Category ID must be positive').optional().nullable(),
})

// ============================================
// Chore Assignment Schemas
// ============================================

export const createChoreAssignmentSchema = z.object({
  choreTemplateId: z.number().int('Template ID must be an integer').positive('Template ID must be positive'),
  assignedToId: z.number().int('User ID must be an integer').positive('User ID must be positive'),
  dueDate: z.string().datetime('Due date must be a valid ISO 8601 datetime').optional().nullable(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
})

export const updateChoreAssignmentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'APPROVED', 'REJECTED']).optional(),
  completedAt: z.string().datetime('Completed date must be a valid ISO 8601 datetime').optional().nullable(),
  approvedAt: z.string().datetime('Approved date must be a valid ISO 8601 datetime').optional().nullable(),
  approvedBy: z.number().int('Approver ID must be an integer').positive('Approver ID must be positive').optional().nullable(),
})

// ============================================
// Chore Category Schemas
// ============================================

export const createChoreCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)').optional(),
})

export const updateChoreCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name must be 100 characters or less').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)').optional(),
})

// ============================================
// ID Parameter Validation
// ============================================

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number),
})

// ============================================
// Type exports for TypeScript
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateChoreTemplateInput = z.infer<typeof createChoreTemplateSchema>
export type UpdateChoreTemplateInput = z.infer<typeof updateChoreTemplateSchema>
export type CreateChoreAssignmentInput = z.infer<typeof createChoreAssignmentSchema>
export type UpdateChoreAssignmentInput = z.infer<typeof updateChoreAssignmentSchema>
export type CreateChoreCategoryInput = z.infer<typeof createChoreCategorySchema>
export type UpdateChoreCategoryInput = z.infer<typeof updateChoreCategorySchema>
