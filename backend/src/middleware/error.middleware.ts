import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || (err.message?.includes('Forbidden') ? 403 : err.message?.includes('not found') ? 404 : 500)
  
  // Do not log sensitive credentials
  console.error(`[Error Handler] ${err.name || 'Error'} (${statusCode}): ${err.message}`)

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred while processing your academic request.',
    },
  })
}
