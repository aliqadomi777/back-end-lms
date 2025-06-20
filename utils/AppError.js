/**
 * Custom Application Error Class
 * 
 * This class extends the built-in Error class to provide
 * structured error handling with HTTP status codes.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message = 'Bad Request', code = null) {
    return new AppError(message, 400, code);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message = 'Unauthorized', code = null) {
    return new AppError(message, 401, code);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message = 'Forbidden', code = null) {
    return new AppError(message, 403, code);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(message = 'Not Found', code = null) {
    return new AppError(message, 404, code);
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message = 'Conflict', code = null) {
    return new AppError(message, 409, code);
  }

  /**
   * Create a 422 Unprocessable Entity error
   */
  static unprocessableEntity(message = 'Unprocessable Entity', code = null) {
    return new AppError(message, 422, code);
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(message = 'Internal Server Error', code = null) {
    return new AppError(message, 500, code);
  }
}

export { AppError };