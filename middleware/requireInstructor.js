/**
 * Require Instructor Middleware
 * 
 * Middleware to ensure only instructor users can access certain routes
 */

const requireInstructor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Instructor access required'
    });
  }

  next();
};

export default requireInstructor;