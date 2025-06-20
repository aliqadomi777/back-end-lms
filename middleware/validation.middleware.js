/**
 * Validation Middleware
 * 
 * This file provides validation middleware functions that work with Joi schemas.
 * It serves as a wrapper/alias for the validate middleware functionality.
 */

import { validate, validateBody, validateParams, validateQuery } from './validate.middleware.js';

/**
 * Validate request data using Joi schema
 * This is an alias for the validate function to maintain compatibility
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 * @returns {Function} Middleware function
 */
export const validateRequest = (schema, source = 'body') => {
  return validate(schema, source);
};

/**
 * Validate request body data
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Middleware function
 */
export const validateRequestBody = (schema) => {
  return validateBody(schema);
};

/**
 * Validate request parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Middleware function
 */
export const validateRequestParams = (schema) => {
  return validateParams(schema);
};

/**
 * Validate request query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Middleware function
 */
export const validateRequestQuery = (schema) => {
  return validateQuery(schema);
};

/**
 * Validate multiple parts of the request
 * @param {Object} schemas - Object containing schemas for different parts
 * @param {Object} schemas.body - Schema for request body
 * @param {Object} schemas.params - Schema for request parameters
 * @param {Object} schemas.query - Schema for request query
 * @returns {Function} Middleware function
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const validationPromises = [];
    
    // Validate body if schema provided
    if (schemas.body) {
      const bodyValidation = new Promise((resolve, reject) => {
        const middleware = validateBody(schemas.body);
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      validationPromises.push(bodyValidation);
    }
    
    // Validate params if schema provided
    if (schemas.params) {
      const paramsValidation = new Promise((resolve, reject) => {
        const middleware = validateParams(schemas.params);
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      validationPromises.push(paramsValidation);
    }
    
    // Validate query if schema provided
    if (schemas.query) {
      const queryValidation = new Promise((resolve, reject) => {
        const middleware = validateQuery(schemas.query);
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      validationPromises.push(queryValidation);
    }
    
    // Execute all validations
    Promise.all(validationPromises)
      .then(() => next())
      .catch((error) => {
        // Error handling is already done by individual validators
        // This catch is just for safety
        if (!res.headersSent) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            error: error.message
          });
        }
      });
  };
};

// Default export for backward compatibility
export default {
  validateRequest,
  validateRequestBody,
  validateRequestParams,
  validateRequestQuery,
  validateMultiple,
  // Re-export from validate.middleware.js
  validate,
  validateBody,
  validateParams,
  validateQuery
};