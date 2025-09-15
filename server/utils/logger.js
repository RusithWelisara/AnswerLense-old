import winston from 'winston';
import path from 'path';
import fs from 'fs';
import environment from '../config/environment.js';

/**
 * Winston logger configuration
 * Handles application logging with different levels and transports
 */

// Create logs directory if it doesn't exist
const logsDir = path.dirname(environment.LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${level}: ${stack || message}`;
  })
);

// Create transports array
const transports = [
  // File transport for all logs
  new winston.transports.File({
    filename: environment.LOG_FILE,
    level: environment.LOG_LEVEL,
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Separate file for errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Add console transport for development
if (environment.isDevelopment()) {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: environment.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add request logging method
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
  };

  const level = res.statusCode >= 400 ? 'error' : 'info';
  logger.log(level, `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`, logData);
};

// Add error logging method
logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };

  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      params: req.params,
      query: req.query,
    };
  }

  logger.error('Application Error', errorData);
};

export default logger;