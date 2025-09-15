import logger from '../utils/logger.js';
import environment from '../config/environment.js';

/**
 * Global error handling middleware
 * Handles all application errors and sends appropriate responses
 */

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.logError(error, req);

  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let errors = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation error';
    errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
    }));
  } else if (error.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId, etc.)
    statusCode = 400;
    message = 'Invalid data format';
  } else if (error.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    message = 'Duplicate data exists';
    const field = Object.keys(error.keyPattern)[0];
    errors = [{ field, message: `${field} already exists` }];
  } else if (error.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    // File upload error
    statusCode = 400;
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    } else {
      message = 'File upload error';
    }
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (environment.isDevelopment()) {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      name: error.name,
      code: error.code,
      statusCode,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const notFoundHandler = (req, res) => {
  const message = `Endpoint not found: ${req.method} ${req.originalUrl}`;
  
  logger.warn(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export default {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  AppError,
};