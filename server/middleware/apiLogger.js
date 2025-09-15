import ApiLog from '../models/ApiLog.js';
import logger from '../utils/logger.js';

/**
 * Middleware to log API requests to MongoDB
 */
const apiLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original res.json to capture response
  const originalJson = res.json;
  let responseBody = {};

  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - startTime;
      
      // Prepare request body (sanitize sensitive data)
      let requestBody = {};
      if (req.body && typeof req.body === 'object') {
        requestBody = { ...req.body };
        // Remove sensitive fields
        delete requestBody.password;
        delete requestBody.token;
        delete requestBody.apiKey;
      }

      // Prepare response body (limit size)
      let logResponseBody = responseBody;
      if (typeof responseBody === 'object' && JSON.stringify(responseBody).length > 1000) {
        logResponseBody = { 
          message: 'Response too large for logging',
          size: JSON.stringify(responseBody).length 
        };
      }

      const logEntry = new ApiLog({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestBody,
        responseBody: logResponseBody,
        errorMessage: res.statusCode >= 400 ? responseBody?.error || responseBody?.message : undefined
      });

      await logEntry.save();

      // Also log to Winston for immediate visibility
      if (res.statusCode >= 400) {
        logger.warn(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms - ${req.ip}`);
      } else {
        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms - ${req.ip}`);
      }

    } catch (error) {
      logger.error('Failed to log API request:', error);
    }
  });

  next();
};

export default apiLogger;