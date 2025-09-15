import express from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import User from '../models/User.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';
import environment from '../config/environment.js';

/**
 * Authentication routes for user signup and login
 * Handles JWT token generation and validation
 */

const router = express.Router();

// Validation schemas
const signupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
  
  rememberMe: Joi.boolean().default(false),
});

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {boolean} rememberMe - Extended expiration if true
 * @returns {Object} Token information
 */
function generateTokens(user, rememberMe = false) {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };
  
  const accessTokenExpiry = rememberMe ? '30d' : environment.JWT_EXPIRES_IN;
  const refreshTokenExpiry = rememberMe ? '90d' : '30d';
  
  const accessToken = jwt.sign(payload, environment.JWT_SECRET, {
    expiresIn: accessTokenExpiry,
    issuer: 'answerlens-api',
    audience: 'answerlens-app',
  });
  
  const refreshToken = jwt.sign(
    { userId: user._id, type: 'refresh' },
    environment.JWT_SECRET,
    {
      expiresIn: refreshTokenExpiry,
      issuer: 'answerlens-api',
      audience: 'answerlens-app',
    }
  );
  
  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpiry,
    tokenType: 'Bearer',
  };
}

/**
 * POST /auth/signup
 * Register a new user account
 */
router.post('/signup', authLimiter, asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = signupSchema.validate(req.body);
  if (error) {
    throw new AppError(
      'Validation failed',
      400,
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }))
    );
  }

  const { name, email, password } = value;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new AppError('Email address is already registered', 409);
  }

  // Create new user
  const user = new User({
    name,
    email,
    password, // Will be hashed by pre-save middleware
  });

  await user.save();

  // Generate tokens
  const tokens = generateTokens(user, false);

  // Update last login
  await user.updateLastLogin();

  // Log successful signup
  logger.info(`New user registered: ${email}`, {
    userId: user._id,
    email: user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Return success response (password excluded automatically by toJSON)
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: user.toJSON(),
      tokens,
    },
  });
}));

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError(
      'Validation failed',
      400,
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }))
    );
  }

  const { email, password, rememberMe } = value;

  // Find user with password field included
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    // Generic error message to prevent email enumeration
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is disabled. Please contact support.', 403);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Log failed login attempt
    logger.warn(`Failed login attempt for: ${email}`, {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const tokens = generateTokens(user, rememberMe);

  // Update last login
  await user.updateLastLogin();

  // Log successful login
  logger.info(`User logged in: ${email}`, {
    userId: user._id,
    email: user.email,
    rememberMe,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Return success response
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      tokens,
    },
  });
}));

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, environment.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Generate new tokens
    const tokens = generateTokens(user, false);

    // Log token refresh
    logger.info(`Token refreshed for user: ${user.email}`, {
      userId: user._id,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('Invalid or expired refresh token', 401);
    }
    throw error;
  }
}));

/**
 * POST /auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is primarily client-side
  // The client should remove the tokens from storage
  
  // Log logout if user info is available
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, environment.JWT_SECRET);
      
      logger.info(`User logged out: ${decoded.email}`, {
        userId: decoded.userId,
        ip: req.ip,
      });
    } catch (error) {
      // Token might be invalid/expired, but we can still process logout
      logger.debug('Logout with invalid/expired token', { ip: req.ip });
    }
  }

  res.json({
    success: true,
    message: 'Logout successful',
  });
}));

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Access token is required', 401);
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, environment.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    res.json({
      success: true,
      data: { user: user.toJSON() },
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('Invalid or expired access token', 401);
    }
    throw error;
  }
}));

/**
 * POST /auth/forgot-password
 * Request password reset (placeholder for future implementation)
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // In a full implementation, you would:
  // 1. Find user by email
  // 2. Generate reset token
  // 3. Send email with reset link
  // 4. Store token with expiration

  // For now, return success regardless to prevent email enumeration
  logger.info(`Password reset requested for: ${email}`, {
    email,
    ip: req.ip,
  });

  res.json({
    success: true,
    message: 'If your email is registered, you will receive password reset instructions.',
  });
}));

/**
 * GET /auth/stats
 * Get authentication statistics (admin only)
 */
router.get('/stats', asyncHandler(async (req, res) => {
  // TODO: Add admin authentication middleware
  
  const stats = await User.getUserStats();
  
  res.json({
    success: true,
    data: { stats },
  });
}));

export default router;