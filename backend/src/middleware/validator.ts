import { Request, Response, NextFunction } from 'express'
import { ZodError, ZodSchema } from 'zod'

/**
 * Validation middleware using Zod schemas
 * @param schema - Zod schema to validate against
 * @param property - Request property to validate (body, query, params)
 */
export const validate = (schema: ZodSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req[property])
      // Replace the property with the parsed result (includes transformations)
      req[property] = result
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        })
        return
      }
      next(error)
    }
  }
}

// Re-export schemas for convenience
export * from '../schemas/validation.schemas.js'
