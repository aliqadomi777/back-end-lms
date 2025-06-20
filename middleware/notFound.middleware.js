/**
 * Not Found Middleware
 * 
 * This middleware handles 404 errors for routes that don't exist.
 */



/**
 * Handle 404 Not Found errors
 */
const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  

  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

export default notFoundHandler;