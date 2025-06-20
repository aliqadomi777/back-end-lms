/**
 * Response Utility Functions
 * 
 * This file contains utility functions for standardizing API responses
 * across the application.
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data
  };

  // Remove data field if it's null or undefined
  if (data === null || data === undefined) {
    delete response.data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Additional error details
 * @param {string} code - Error code
 * @returns {Object} JSON response
 */
const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = null, code = null) => {
  const response = {
    success: false,
    message,
    statusCode
  };

  // Add error code if provided
  if (code) {
    response.code = code;
  }

  // Add additional error details if provided
  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
const paginatedResponse = (res, data, pagination, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.currentPage || 1,
      totalPages: pagination.totalPages || 1,
      totalItems: pagination.totalItems || 0,
      itemsPerPage: pagination.itemsPerPage || 10,
      hasNextPage: pagination.hasNextPage || false,
      hasPrevPage: pagination.hasPrevPage || false
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} errors - Validation errors
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const validationErrorResponse = (res, errors, message = 'Validation Error') => {
  return errorResponse(res, message, 422, errors, 'VALIDATION_ERROR');
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 404, null, 'NOT_FOUND');
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401, null, 'UNAUTHORIZED');
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const forbiddenResponse = (res, message = 'Access forbidden') => {
  return errorResponse(res, message, 403, null, 'FORBIDDEN');
};

export {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse
};