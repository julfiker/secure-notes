import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // MongoDB duplicate key error (code 11000)
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err && err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: `Invalid format for identifier: ${err.value}`,
    });
    return;
  }

  // General unhandled internal errors
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && process.env.NODE_ENV !== 'test') {
    console.error('[Internal Error]', err);
  }

  res.status(500).json({
    success: false,
    message: isProduction ? 'An unexpected internal error occurred.' : err.message || 'Internal Server Error',
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
};

