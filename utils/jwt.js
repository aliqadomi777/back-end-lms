/**
 * JWT Utility Functions
 * 
 * This file contains utility functions for JWT token generation,
 * verification, and management including access and refresh tokens.
 */

import jwt from 'jsonwebtoken';

class JWTUtils {
  /**
   * Generate access token
   * @param {Object} payload - User data to encode in token
   * @returns {string} JWT access token
   */
  static generateAccessToken(payload) {
    try {
      const token = jwt.sign(
        {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          type: 'access'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
          issuer: 'lms-backend',
          audience: 'lms-frontend'
        }
      );
      
      return token;
    } catch (error) {
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - User data to encode in token
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(payload) {
    try {
      const token = jwt.sign(
        {
          id: payload.id,
          email: payload.email,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
          issuer: 'lms-backend',
          audience: 'lms-frontend'
        }
      );
      
      return token;
    } catch (error) {
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'lms-backend',
        audience: 'lms-frontend'
      });
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        {
          issuer: 'lms-backend',
          audience: 'lms-frontend'
        }
      );
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Generate email verification token
   * @param {Object} payload - User data
   * @returns {string} Email verification token
   */
  static generateEmailVerificationToken(payload) {
    try {
      const token = jwt.sign(
        {
          id: payload.id,
          email: payload.email,
          type: 'email_verification'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '24h',
          issuer: 'lms-backend'
        }
      );
      
      return token;
    } catch (error) {
      throw new Error('Email verification token generation failed');
    }
  }

  /**
   * Generate password reset token
   * @param {Object} payload - User data
   * @returns {string} Password reset token
   */
  static generatePasswordResetToken(payload) {
    try {
      const token = jwt.sign(
        {
          id: payload.id,
          email: payload.email,
          type: 'password_reset'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '1h',
          issuer: 'lms-backend'
        }
      );
      
      return token;
    } catch (error) {
      throw new Error('Password reset token generation failed');
    }
  }

  /**
   * Verify special tokens (email verification, password reset)
   * @param {string} token - Token to verify
   * @param {string} expectedType - Expected token type
   * @returns {Object} Decoded token payload
   */
  static verifySpecialToken(token, expectedType) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'lms-backend'
      });
      
      if (decoded.type !== expectedType) {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null
   */
  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  static isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return expiration < new Date();
  }
}

export default JWTUtils;