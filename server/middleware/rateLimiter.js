const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create different rate limiters for different endpoints
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json(defaultOptions.message);
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// General rate limiter
const generalLimiter = createRateLimiter();

// Strict rate limiter for upload endpoints
const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per 15 minutes
  message: {
    error: 'Too many file uploads from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  }
});

// Feedback rate limiter
const feedbackLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 feedback submissions per minute
  message: {
    error: 'Too many feedback submissions, please try again later.',
    retryAfter: 60
  }
});

module.exports = {
  generalLimiter,
  uploadLimiter,
  feedbackLimiter
};