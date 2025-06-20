/**
 * Authentication Middleware
 *
 * This file contains middleware functions for JWT authentication
 * and role-based access control.
 */

import JWTUtils from "../utils/jwt.js";
import UserModel from "../models/User.model.js";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

/**
 * Verify JWT token and authenticate user (no DB lookup)
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }
    // Verify token
    const decoded = JWTUtils.verifyAccessToken(token);
    req.user = decoded; // Attach decoded JWT payload
    next();
  } catch (error) {
    if (error.message === "Token expired") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = JWTUtils.verifyAccessToken(token);

    // Get user from database
    const user = await UserModel.findById(decoded.id);

    if (user && user.is_active && !user.deleted_at) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        approval_status: user.approval_status,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

/**
 * Require specific role(s)
 * @param {string|Array} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

/**
 * Require student role
 */
const requireStudent = requireRole("student");

/**
 * Require instructor role
 */
const requireInstructor = requireRole("instructor");

/**
 * Require admin role
 */
const requireAdmin = requireRole("admin");

/**
 * Require instructor or admin role
 */
const requireInstructorOrAdmin = requireRole(["instructor", "admin"]);

/**
 * Require verified email
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  next();
};

/**
 * Require approved instructor
 */
const requireApprovedInstructor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (
    req.user.role === "instructor" &&
    req.user.approval_status !== "approved"
  ) {
    return res.status(403).json({
      success: false,
      message: "Instructor approval required",
      code: "INSTRUCTOR_NOT_APPROVED",
    });
  }

  next();
};

/**
 * Check if user owns resource or is admin
 * @param {string} userIdField - Field name containing user ID in req.params or req.body
 */
const requireOwnershipOrAdmin = (userIdField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admin can access everything
    if (req.user.role === "admin") {
      return next();
    }

    // Get user ID from params or body
    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    // Check ownership
    if (parseInt(resourceUserId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails && profile.emails[0]?.value;
        const name = profile.displayName;
        const oauth_id = profile.id;
        // Find or create user
        let user = await UserModel.findByOAuth("google", oauth_id);
        if (!user) {
          user = await UserModel.createOAuthUser("google", oauth_id, {
            name,
            email,
          });
        }
        // Attach oauth_id for downstream use
        user.oauth_id = oauth_id;
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export {
  authenticate,
  optionalAuth,
  requireRole,
  requireStudent,
  requireInstructor,
  requireAdmin,
  requireInstructorOrAdmin,
  requireVerified,
  requireApprovedInstructor,
  requireOwnershipOrAdmin,
  passport,
};
