export class AppError extends Error {
  statusCode: number
  code?: string

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export function notFoundHandler(_req: any, res: any) {
  res.status(404).json({
    success: false,
    data: null,
    error: { message: 'Not found' },
  })
}

export function errorHandler(err: Error, _req: any, res: any, _next: any) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: { message: err.message, code: err.code },
    })
    return
  }

  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    data: null,
    error: { message: 'Internal server error' },
  })
}
