import { Request, Response, NextFunction } from 'express'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { logger } from '../utils/logger.js'
import { notifyServerError } from '../utils/error-webhook.js'

const getSafeErrorMessage = (err: Error | AppError, statusCode: number): string => {
  if (process.env.NODE_ENV !== 'production') return err.message
  return statusCode >= 500 ? 'Internal server error' : err.message
}

export class AppError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error for debugging
  logger.error({
    type: 'ERROR',
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: getSafeErrorMessage(err, err.statusCode),
        code: err.code,
      },
    })
    return
  }

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          message: getSafeErrorMessage(err, 409),
          code: 'CONFLICT',
        },
      })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          message: getSafeErrorMessage(err, 404),
          code: 'NOT_FOUND',
        },
      })
      return
    }
  }

  // Handle unknown errors (500)
  // Send error notification to webhook for server errors
  notifyServerError(err, { path: req.path, method: req.method }).catch(webhookErr => {
    logger.error('[ErrorHandler] Failed to send error webhook:', webhookErr)
  })

  res.status(500).json({
    success: false,
    error: {
      message: getSafeErrorMessage(err, 500),
      code: 'INTERNAL_ERROR',
    },
  })
}

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  })
}
