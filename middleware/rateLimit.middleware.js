/**
 * Rate Limiting Middleware
 * 
 * Implements rate limiting for API endpoints to prevent abuse
 */

import rateLimit from 'express-rate-limit';
import rateLimitConfig from '../config/rateLimit.config.js';

// General API rate limit
export const apiLimiter = rateLimit(rateLimitConfig.api);

// Strict rate limit for authentication endpoints
export const authLimiter = rateLimit(rateLimitConfig.auth);

// Upload rate limit
export const uploadLimiter = rateLimit(rateLimitConfig.upload);

export default apiLimiter;