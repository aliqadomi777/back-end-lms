/**
 * Validation Middleware
 * 
 * This middleware validates request data using Joi schemas.
 */



/**
 * Validate request data against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      

      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages
      });
    }
    
    // Replace request data with validated and sanitized data
    req[source] = value;
    
    next();
  };
};

/**
 * Validate request body
 * @param {Object} schema - Joi validation schema
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request params
 * @param {Object} schema - Joi validation schema
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate request query
 * @param {Object} schema - Joi validation schema
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate multiple sources at once
 * @param {Object} schemas - Object containing schemas for different sources
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    
    // Validate each source
    Object.keys(schemas).forEach(source => {
      const schema = schemas[source];
      const dataToValidate = req[source];
      
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      
      if (error) {
        const sourceErrors = error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        errors.push(...sourceErrors);
      } else {
        // Replace with validated data
        req[source] = value;
      }
    });
    
    if (errors.length > 0) {

      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

/**
 * Sanitize and validate file upload
 * @param {Object} options - Upload validation options
 */
const validateFileUpload = (options = {}) => {
  const {
    required = false,
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFiles = 1
  } = options;
  
  return (req, res, next) => {
    const files = req.files || [];
    const file = req.file;
    
    // Check if file is required
    if (required && !file && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File upload is required'
      });
    }
    
    // If no files and not required, continue
    if (!file && files.length === 0) {
      return next();
    }
    
    const filesToValidate = file ? [file] : files;
    
    // Check file count
    if (filesToValidate.length > maxFiles) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxFiles} file(s) allowed`
      });
    }
    
    // Validate each file
    for (const uploadedFile of filesToValidate) {
      // Check file size
      if (uploadedFile.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
        });
      }
      
      // Check file type
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }
    

    
    next();
  };
};

export {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  validateMultiple,
  validateFileUpload
};

export default validate;