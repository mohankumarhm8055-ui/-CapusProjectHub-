import { Request, Response, NextFunction } from 'express'
import { config } from '../config/env.js'

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod schema validation failures with clean 400 status
  if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    const firstIssue = err.issues[0]
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue?.message || 'Request validation failed.',
      },
    })
    return
  }

  // Handle malformed MongoDB ObjectIds cleanly
  if (err?.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IDENTIFIER',
        message: 'Invalid resource identifier format.',
      },
    })
    return
  }

  // Handle MongoDB duplicate key errors safely without exposing internal index names
  if (err?.code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RECORD',
        message: 'A record with the supplied unique identifier already exists.',
      },
    })
    return
  }

  const statusCode =
    err.statusCode ||
    err.status ||
    (err.message?.includes('Forbidden') ? 403 : err.message?.includes('not found') ? 404 : 500)

  // Log server-side error summary without credentials
  console.error(`[Error Handler] ${err.name || 'Error'} (${statusCode}): ${err.message}`)

  const isUnhandledServerError = statusCode >= 500 && err?.code !== 'DATABASE_UNAVAILABLE'
  const safeMessage =
    config.NODE_ENV === 'production' && isUnhandledServerError
      ? 'An internal server error occurred while processing your request.'
      : err.message || 'An unexpected error occurred while processing your request.'

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: safeMessage,
    },
  })
}
