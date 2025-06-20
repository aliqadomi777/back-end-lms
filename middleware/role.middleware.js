/**
 * Role-based Access Control Middleware
 * 
 * This middleware provides flexible role-based access control
 * for different user roles in the system.
 */

/**
 * Require specific role(s) middleware
 * @param {...string} allowedRoles - One or more roles that are allowed
 * @returns {Function} Middleware function
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Require admin role middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Require instructor role middleware (includes admin)
 */
export const requireInstructor = requireRole('instructor', 'admin');

/**
 * Require student role middleware (includes admin for testing)
 */
export const requireStudent = requireRole('student', 'admin');

/**
 * Require instructor or admin role middleware
 */
export const requireInstructorOrAdmin = requireRole('instructor', 'admin');

/**
 * Require student or instructor role middleware
 */
export const requireStudentOrInstructor = requireRole('student', 'instructor', 'admin');

/**
 * Check if user has any of the specified roles
 * @param {Array} roles - Array of roles to check
 * @returns {Function} Middleware function
 */
export const hasAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user has all of the specified roles (for future multi-role support)
 * @param {Array} roles - Array of roles that user must have
 * @returns {Function} Middleware function
 */
export const hasAllRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // For now, we'll check if user role is in the required roles
    // This can be extended for multi-role support in the future
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Role hierarchy check - allows higher roles to access lower role resources
 * Role hierarchy: admin > instructor > student
 */
const roleHierarchy = {
  admin: 3,
  instructor: 2,
  student: 1
};

/**
 * Require minimum role level middleware
 * @param {string} minimumRole - Minimum role required
 * @returns {Function} Middleware function
 */
export const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[minimumRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Minimum role required: ${minimumRole}`
      });
    }

    next();
  };
};

// Default export for backward compatibility
export default {
  requireRole,
  requireAdmin,
  requireInstructor,
  requireStudent,
  requireInstructorOrAdmin,
  requireStudentOrInstructor,
  hasAnyRole,
  hasAllRoles,
  requireMinimumRole
};