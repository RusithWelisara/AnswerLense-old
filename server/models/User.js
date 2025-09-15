import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User model for authentication and user management
 * Handles user registration, login, and profile data
 */

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ],
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: null,
  },
  
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true,
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  
  // Usage Statistics
  analysisCount: {
    type: Number,
    default: 0,
  },
  
  lastLoginAt: {
    type: Date,
    default: null,
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    select: false,
  },
  
  passwordResetExpires: {
    type: Date,
    select: false,
  },

  // Refresh Token Storage (for secure token rotation)
  refreshTokens: {
    type: [{
      tokenHash: {
        type: String,
        required: true,
      },
      jti: {
        type: String,
        required: true,
        unique: true,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      deviceInfo: {
        userAgent: String,
        ip: String,
      },
      isRevoked: {
        type: Boolean,
        default: false,
      },
    }],
    select: false,
    default: [],
  },
  
  // Email Verification
  emailVerificationToken: {
    type: String,
    select: false,
  },
  
  emailVerificationExpires: {
    type: Date,
    select: false,
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      analysis: {
        type: Boolean,
        default: true,
      },
    },
    language: {
      type: String,
      default: 'en',
    },
  },
  
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name display
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update email verification status
userSchema.pre('save', function(next) {
  if (this.isModified('email') && !this.isNew) {
    this.isEmailVerified = false;
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to increment analysis count
userSchema.methods.incrementAnalysisCount = async function() {
  this.analysisCount += 1;
  return this.save();
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Instance method to add refresh token
userSchema.methods.addRefreshToken = async function(tokenHash, jti, expiresAt, deviceInfo = {}) {
  // Remove expired tokens
  this.refreshTokens = this.refreshTokens.filter(token => 
    token.expiresAt > new Date() && !token.isRevoked
  );

  // Limit to maximum 5 active refresh tokens per user
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens.sort((a, b) => a.createdAt - b.createdAt);
    this.refreshTokens.shift(); // Remove oldest token
  }

  // Add new refresh token
  this.refreshTokens.push({
    tokenHash,
    jti,
    expiresAt,
    deviceInfo,
  });

  return this.save();
};

// Instance method to validate and consume refresh token
userSchema.methods.validateRefreshToken = async function(tokenHash, jti) {
  const tokenRecord = this.refreshTokens.find(token => 
    token.jti === jti && !token.isRevoked && token.expiresAt > new Date()
  );

  if (!tokenRecord) {
    return { valid: false, compromised: false };
  }

  // Check if token hash matches
  const isValidHash = await bcrypt.compare(tokenHash, tokenRecord.tokenHash);
  
  if (!isValidHash) {
    // Potential token reuse attack - revoke all tokens
    await this.revokeAllRefreshTokens();
    return { valid: false, compromised: true };
  }

  return { valid: true, compromised: false, tokenRecord };
};

// Instance method to revoke specific refresh token
userSchema.methods.revokeRefreshToken = async function(jti) {
  const token = this.refreshTokens.find(token => token.jti === jti);
  if (token) {
    token.isRevoked = true;
  }
  return this.save();
};

// Instance method to revoke all refresh tokens
userSchema.methods.revokeAllRefreshTokens = async function() {
  this.refreshTokens.forEach(token => {
    token.isRevoked = true;
  });
  return this.save();
};

// Instance method to clean up expired tokens
userSchema.methods.cleanupExpiredTokens = async function() {
  const beforeCount = this.refreshTokens.length;
  this.refreshTokens = this.refreshTokens.filter(token => 
    token.expiresAt > new Date() && !token.isRevoked
  );
  
  if (beforeCount !== this.refreshTokens.length) {
    await this.save();
  }
  
  return this.refreshTokens.length;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to get user stats
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        verifiedUsers: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
        totalAnalyses: { $sum: '$analysisCount' },
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    totalAnalyses: 0,
  };
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  return userObject;
};

export default mongoose.model('User', userSchema);