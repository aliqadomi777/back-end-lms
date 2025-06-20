/**
 * Global Error Handling Middleware
 * 
 * This file contains the global error handler that catches all errors
 * and formats them into consistent API responses.
 */



/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, next) => {
  let err = { ...error };
  err.message = error.message;

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    const message = 'Resource not found';
    err = new APIError(message, 404);
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    const message = 'Duplicate field value entered';
    err = new APIError(message, 400);
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map(val => val.message).join(', ');
    err = new APIError(message, 400);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    err = new APIError(message, 401);
  }

  if (error.name === 'TokenExpiredError') {
    const message = 'Token expired';
    err = new APIError(message, 401, 'TOKEN_EXPIRED');
  }

  // PostgreSQL errors
  if (error.code === '23505') { // Unique violation
    const message = 'Duplicate entry';
    err = new APIError(message, 400, 'DUPLICATE_ENTRY');
  }

  if (error.code === '23503') { // Foreign key violation
    const message = 'Referenced resource not found';
    err = new APIError(message, 400, 'FOREIGN_KEY_VIOLATION');
  }

  if (error.code === '23502') { // Not null violation
    const message = 'Required field missing';
    err = new APIError(message, 400, 'REQUIRED_FIELD_MISSING');
  }

  if (error.code === '23514') { // Check violation
    const message = 'Invalid field value';
    err = new APIError(message, 400, 'INVALID_FIELD_VALUE');
  }

  // Joi validation errors
  if (error.isJoi) {
    const message = error.details.map(detail => detail.message).join(', ');
    err = new APIError(message, 400, 'VALIDATION_ERROR');
  }

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    err = new APIError(message, 400, 'FILE_TOO_LARGE');
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    err = new APIError(message, 400, 'TOO_MANY_FILES');
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    err = new APIError(message, 400, 'UNEXPECTED_FILE');
  }

  // Rate limiting errors
  if (error.status === 429) {
    const message = 'Too many requests';
    err = new APIError(message, 429, 'RATE_LIMIT_EXCEEDED');
  }

  // CORS errors
  if (error.message && error.message.includes('CORS')) {
    const message = 'CORS policy violation';
    err = new APIError(message, 403, 'CORS_ERROR');
  }

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || null;

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(code && { code }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: error
    })
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found error handler
 */
const notFound = (req, res, next) => {
  const error = new APIError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

export {
  APIError,
  errorHandler,
  asyncHandler,
  notFound
};

export default {
  APIError,
  errorHandler,
  asyncHandler,
  notFound
};