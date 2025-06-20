/**
 * Request Logger Middleware
 * 
 * Simple request logging middleware for development and debugging
 */

const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  }
  next();
};

export default requestLogger;