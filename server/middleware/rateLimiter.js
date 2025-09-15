import rateLimit from 'express-rate-limit';
import environment from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Rate limiting middleware configuration
 * Protects API endpoints from abuse and spam
 */

// General rate limiter for all endpoints
export const generalLimiter = rateLimit({
  windowMs: environment.RATE_LIMIT_WINDOW, // 15 minutes
  max: environment.RATE_LIMIT_MAX_REQUESTS, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(environment.RATE_LIMIT_WINDOW / 1000 / 60), // minutes
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks in development
    if (environment.isDevelopment() && req.path === '/api/health') {
      return true;
    }
    return false;
  },
  onLimitReached: (req) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
  },
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15, // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  onLimitReached: (req) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
  },
});

// Rate limiter for file upload endpoints
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 uploads per window
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    retryAfter: 10, // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
  },
});

// Rate limiter for AI analysis endpoints (more restrictive)
export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 analysis requests per hour
  message: {
    success: false,
    error: 'Analysis limit reached. Please wait before requesting more analyses.',
    retryAfter: 60, // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req) => {
    logger.warn(`Analysis rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
  },
});

export default {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  analysisLimiter,
};