import validator from "validator";
import { AppError } from "./AppError.js";

/**
 * Sanitize and normalize string input
 * @param {string} input - Input string
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input, options = {}) => {
  if (typeof input !== "string") {
    return input;
  }

  const {
    trim = true,
    escape = false,
    stripTags = false,
    normalizeWhitespace = true,
    maxLength = null,
    allowEmpty = true,
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Strip HTML tags
  if (stripTags) {
    sanitized = validator.stripLow(sanitized);
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  }

  // Escape HTML entities
  if (escape) {
    sanitized = validator.escape(sanitized);
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, " ");
  }

  // Check length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Check if empty is allowed
  if (!allowEmpty && sanitized.length === 0) {
    throw new AppError("Value cannot be empty", 400);
  }

  return sanitized;
};

/**
 * Sanitize email address
 * @param {string} email - Email address
 * @returns {string} Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== "string") {
    throw new AppError("Email must be a string", 400);
  }

  const sanitized = validator.normalizeEmail(email.trim().toLowerCase(), {
    gmail_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_lowercase: true,
    outlookdotcom_remove_subaddress: false,
    yahoo_lowercase: true,
    yahoo_remove_subaddress: false,
    icloud_lowercase: true,
    icloud_remove_subaddress: false,
  });

  if (!sanitized || !validator.isEmail(sanitized)) {
    throw new AppError("Invalid email address", 400);
  }

  return sanitized;
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @param {string} countryCode - Country code (default: 'US')
 * @returns {string} Sanitized phone number
 */
export const sanitizePhone = (phone, countryCode = "US") => {
  if (typeof phone !== "string") {
    throw new AppError("Phone number must be a string", 400);
  }

  // Remove all non-digit characters except +
  let sanitized = phone.replace(/[^\d+]/g, "");

  // Validate phone number
  if (!validator.isMobilePhone(sanitized, countryCode)) {
    throw new AppError("Invalid phone number", 400);
  }

  return sanitized;
};

/**
 * Sanitize URL
 * @param {string} url - URL string
 * @param {Object} options - URL options
 * @returns {string} Sanitized URL
 */
export const sanitizeUrl = (url, options = {}) => {
  if (typeof url !== "string") {
    throw new AppError("URL must be a string", 400);
  }

  const {
    protocols = ["http", "https"],
    require_protocol = true,
    require_host = true,
    require_valid_protocol = true,
    allow_underscores = false,
    host_whitelist = false,
    host_blacklist = false,
    allow_trailing_dot = false,
    allow_protocol_relative_urls = false,
  } = options;

  let sanitized = url.trim();

  // Add protocol if missing and required
  if (require_protocol && !sanitized.match(/^https?:\/\//)) {
    sanitized = `https://${sanitized}`;
  }

  // Validate URL
  if (
    !validator.isURL(sanitized, {
      protocols,
      require_protocol,
      require_host,
      require_valid_protocol,
      allow_underscores,
      host_whitelist,
      host_blacklist,
      allow_trailing_dot,
      allow_protocol_relative_urls,
    })
  ) {
    throw new AppError("Invalid URL", 400);
  }

  return sanitized;
};

/**
 * Sanitize and validate password
 * @param {string} password - Password string
 * @param {Object} options - Password options
 * @returns {string} Validated password
 */
export const validatePassword = (password, options = {}) => {
  if (typeof password !== "string") {
    throw new AppError("Password must be a string", 400);
  }

  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    allowWhitespace = false,
  } = options;

  // Check length
  if (password.length < minLength) {
    throw new AppError(
      `Password must be at least ${minLength} characters long`,
      400
    );
  }

  if (password.length > maxLength) {
    throw new AppError(
      `Password must be no more than ${maxLength} characters long`,
      400
    );
  }

  // Check whitespace
  if (!allowWhitespace && /\s/.test(password)) {
    throw new AppError("Password cannot contain whitespace", 400);
  }

  // Check character requirements
  if (requireUppercase && !/[A-Z]/.test(password)) {
    throw new AppError(
      "Password must contain at least one uppercase letter",
      400
    );
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    throw new AppError(
      "Password must contain at least one lowercase letter",
      400
    );
  }

  if (requireNumbers && !/\d/.test(password)) {
    throw new AppError("Password must contain at least one number", 400);
  }

  if (
    requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    throw new AppError(
      "Password must contain at least one special character (@$!%*?& etc.)",
      400
    );
  }

  return password;
};

/**
 * Sanitize numeric input
 * @param {any} input - Input value
 * @param {Object} options - Numeric options
 * @returns {number} Sanitized number
 */
export const sanitizeNumber = (input, options = {}) => {
  const {
    min = null,
    max = null,
    integer = false,
    positive = false,
    allowZero = true,
  } = options;

  let number;

  if (typeof input === "string") {
    // Remove non-numeric characters except decimal point and minus sign
    const cleaned = input.replace(/[^\d.-]/g, "");
    number = parseFloat(cleaned);
  } else {
    number = Number(input);
  }

  if (isNaN(number)) {
    throw new AppError("Invalid number", 400);
  }

  // Check if integer is required
  if (integer && !Number.isInteger(number)) {
    throw new AppError("Value must be an integer", 400);
  }

  // Check if positive is required
  if (positive && number < 0) {
    throw new AppError("Value must be positive", 400);
  }

  // Check if zero is allowed
  if (!allowZero && number === 0) {
    throw new AppError("Value cannot be zero", 400);
  }

  // Check min/max bounds
  if (min !== null && number < min) {
    throw new AppError(`Value must be at least ${min}`, 400);
  }

  if (max !== null && number > max) {
    throw new AppError(`Value must be at most ${max}`, 400);
  }

  return number;
};

/**
 * Sanitize date input
 * @param {any} input - Input date
 * @param {Object} options - Date options
 * @returns {Date} Sanitized date
 */
export const sanitizeDate = (input, options = {}) => {
  const {
    minDate = null,
    maxDate = null,
    allowFuture = true,
    allowPast = true,
  } = options;

  let date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === "string" || typeof input === "number") {
    date = new Date(input);
  } else {
    throw new AppError("Invalid date format", 400);
  }

  if (isNaN(date.getTime())) {
    throw new AppError("Invalid date", 400);
  }

  const now = new Date();

  // Check future/past restrictions
  if (!allowFuture && date > now) {
    throw new AppError("Future dates are not allowed", 400);
  }

  if (!allowPast && date < now) {
    throw new AppError("Past dates are not allowed", 400);
  }

  // Check min/max bounds
  if (minDate && date < minDate) {
    throw new AppError(`Date must be after ${minDate.toISOString()}`, 400);
  }

  if (maxDate && date > maxDate) {
    throw new AppError(`Date must be before ${maxDate.toISOString()}`, 400);
  }

  return date;
};

/**
 * Sanitize boolean input
 * @param {any} input - Input value
 * @returns {boolean} Sanitized boolean
 */
export const sanitizeBoolean = (input) => {
  if (typeof input === "boolean") {
    return input;
  }

  if (typeof input === "string") {
    const lower = input.toLowerCase().trim();
    if (["true", "1", "yes", "on"].includes(lower)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(lower)) {
      return false;
    }
  }

  if (typeof input === "number") {
    return input !== 0;
  }

  throw new AppError("Invalid boolean value", 400);
};

/**
 * Sanitize array input
 * @param {any} input - Input value
 * @param {Object} options - Array options
 * @returns {Array} Sanitized array
 */
export const sanitizeArray = (input, options = {}) => {
  const {
    minLength = 0,
    maxLength = null,
    unique = false,
    itemValidator = null,
  } = options;

  let array;

  if (Array.isArray(input)) {
    array = input;
  } else if (typeof input === "string") {
    // Try to parse as JSON array or split by comma
    try {
      array = JSON.parse(input);
      if (!Array.isArray(array)) {
        throw new Error("Not an array");
      }
    } catch {
      array = input
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  } else {
    throw new AppError("Invalid array format", 400);
  }

  // Check length
  if (array.length < minLength) {
    throw new AppError(`Array must have at least ${minLength} items`, 400);
  }

  if (maxLength && array.length > maxLength) {
    throw new AppError(`Array must have at most ${maxLength} items`, 400);
  }

  // Remove duplicates if unique is required
  if (unique) {
    array = [...new Set(array)];
  }

  // Validate each item if validator is provided
  if (itemValidator && typeof itemValidator === "function") {
    array = array.map((item) => itemValidator(item));
  }

  return array;
};

/**
 * Sanitize object input
 * @param {any} input - Input value
 * @param {Object} schema - Object schema
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (input, schema = {}) => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AppError("Invalid object format", 400);
  }

  const sanitized = {};

  // Process each field in the schema
  Object.keys(schema).forEach((key) => {
    const fieldConfig = schema[key];
    const value = input[key];

    if (value !== undefined) {
      if (typeof fieldConfig === "function") {
        // Field config is a validator function
        sanitized[key] = fieldConfig(value);
      } else if (typeof fieldConfig === "object") {
        // Field config is an options object
        const {
          validator: fieldValidator,
          required = false,
          default: defaultValue,
        } = fieldConfig;

        if (value !== undefined && value !== null) {
          sanitized[key] = fieldValidator ? fieldValidator(value) : value;
        } else if (required) {
          throw new AppError(`Field '${key}' is required`, 400);
        } else if (defaultValue !== undefined) {
          sanitized[key] = defaultValue;
        }
      }
    } else if (fieldConfig.required) {
      throw new AppError(`Field '${key}' is required`, 400);
    } else if (fieldConfig.default !== undefined) {
      sanitized[key] = fieldConfig.default;
    }
  });

  return sanitized;
};

/**
 * Remove XSS threats from input
 * @param {any} input - Input value
 * @returns {any} Cleaned input
 */
export const removeXSS = (input) => {
  if (typeof input === "string") {
    // Remove script tags and their content
    let cleaned = input.replace(/<script[^>]*>.*?<\/script>/gi, "");

    // Remove javascript: protocols
    cleaned = cleaned.replace(/javascript:/gi, "");

    // Remove on* event handlers
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

    // Remove data: protocols (except data:image)
    cleaned = cleaned.replace(/data:(?!image)[^;]*;/gi, "");

    return cleaned;
  }

  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input)) {
      return input.map(removeXSS);
    }

    const cleaned = {};
    Object.keys(input).forEach((key) => {
      cleaned[key] = removeXSS(input[key]);
    });
    return cleaned;
  }

  return input;
};

/**
 * Validate and sanitize file name
 * @param {string} filename - File name
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== "string") {
    throw new AppError("Filename must be a string", 400);
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, "");

  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "_");

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf("."));
    const name = sanitized.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }

  // Ensure it's not empty
  if (sanitized.trim().length === 0) {
    throw new AppError("Filename cannot be empty", 400);
  }

  return sanitized;
};

/**
 * Comprehensive input sanitization
 * @param {Object} data - Input data object
 * @param {Object} schema - Sanitization schema
 * @returns {Object} Sanitized data
 */
export const sanitizeInput = (data, schema) => {
  if (!data || typeof data !== "object") {
    throw new AppError("Invalid input data", 400);
  }

  // Remove XSS threats first
  const cleanedData = removeXSS(data);

  // Apply schema-based sanitization
  return sanitizeObject(cleanedData, schema);
};

export const validateEmail = (email) => {
  return typeof email === "string" && validator.isEmail(email.trim());
};

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  validatePassword,
  sanitizeNumber,
  sanitizeDate,
  sanitizeBoolean,
  sanitizeArray,
  sanitizeObject,
  removeXSS,
  sanitizeFilename,
  sanitizeInput,
};
