/**
 * Require Student Middleware
 * 
 * Middleware to ensure only student users can access certain routes
 */

const requireStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Student access required'
    });
  }

  next();
};

export default requireStudent;