import ApiLog from '../models/ApiLog.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to log API requests to MongoDB
 */
export const apiLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture original res.end to log response
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log to MongoDB (async, don't block response)
    logToDatabase(req, res, responseTime).catch(error => {
      logger.error('Failed to log API request to database:', error);
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Log request details to MongoDB
 */
async function logToDatabase(req, res, responseTime) {
  try {
    const logData = {
      method: req.method,
      endpoint: req.path,
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent') || '',
      statusCode: res.statusCode,
      responseTime: responseTime
    };

    // Add file size for upload requests
    if (req.file) {
      logData.fileSize = req.file.size;
    }

    // Add error message for failed requests
    if (res.statusCode >= 400 && res.locals.errorMessage) {
      logData.errorMessage = res.locals.errorMessage;
    }

    await ApiLog.create(logData);
    
    // Log to Winston as well
    logger.info('API Request', {
      method: req.method,
      endpoint: req.path,
      ip: logData.ipAddress,
      statusCode: res.statusCode,
      responseTime: responseTime
    });

  } catch (error) {
    logger.error('Database logging failed:', error);
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '0.0.0.0';
}

/**
 * Middleware to set error message for logging
 */
export const setErrorMessage = (message) => {
  return (req, res, next) => {
    res.locals.errorMessage = message;
    next();
  };
};