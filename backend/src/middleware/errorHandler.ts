import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { captureException } from '../utils/sentry';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ErrorTracker {
  private static errors: Array<{
    timestamp: Date;
    error: string;
    stack?: string;
    context?: any;
  }> = [];

  static trackError(error: Error, context?: any) {
    const errorRecord = {
      timestamp: new Date(),
      error: error.message,
      stack: error.stack,
      context
    };

    this.errors.push(errorRecord);

    // Keep only last 100 errors in memory
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    // Log to winston
    logger.error('Error tracked:', {
      message: error.message,
      stack: error.stack,
      context
    });

    // Send to Sentry (if configured)
    captureException(error, context);
  }

  static getRecentErrors(limit: number = 10) {
    return this.errors.slice(-limit);
  }

  static getErrorCount() {
    return this.errors.length;
  }
}

// Global error handler middleware
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Track the error
  ErrorTracker.trackError(err, {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    user: (req as any).user
  });

  // Log error
  logger.error(`${req.method} ${req.path} - ${statusCode} - ${message}`, {
    error: err.message,
    stack: err.stack,
    user: (req as any).user?.email
  });

  // Send response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found'
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
