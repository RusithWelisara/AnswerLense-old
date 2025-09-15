import cors from 'cors';
import environment from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * Configures allowed origins and methods for API access
 */

// Define allowed origins based on environment
const getAllowedOrigins = () => {
  const origins = [environment.FRONTEND_URL];
  
  // Add additional origins for development
  if (environment.isDevelopment()) {
    origins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:5173',
      'https://localhost:8080'
    );
  }
  
  // Add production domains if specified
  if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...additionalOrigins);
  }
  
  return origins;
};

// CORS configuration options
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version',
  ],
  
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
  ],
  
  credentials: true, // Allow cookies and credentials
  
  maxAge: 86400, // Cache preflight response for 24 hours
  
  optionsSuccessStatus: 200, // Support legacy browsers
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

// Custom CORS handler with logging
export const corsHandler = (req, res, next) => {
  corsMiddleware(req, res, (err) => {
    if (err) {
      logger.warn(`CORS error for ${req.method} ${req.originalUrl} from origin: ${req.get('origin')}`, {
        origin: req.get('origin'),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      return res.status(403).json({
        success: false,
        error: 'CORS policy violation',
        message: 'This origin is not allowed to access this resource',
        timestamp: new Date().toISOString(),
      });
    }
    next();
  });
};

export default corsHandler;