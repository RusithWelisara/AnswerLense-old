import mongoose from 'mongoose';

/**
 * Feedback model for collecting user feedback
 * Handles user feedback, bug reports, and feature requests
 */

const feedbackSchema = new mongoose.Schema({
  // User Reference (optional for anonymous feedback)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  
  // Analysis Reference (if feedback is for specific analysis)
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    default: null,
    index: true,
  },
  
  // Feedback Type
  type: {
    type: String,
    enum: [
      'general_feedback',
      'bug_report',
      'feature_request',
      'analysis_feedback',
      'ui_feedback',
      'performance_issue',
      'content_suggestion',
      'other'
    ],
    required: [true, 'Feedback type is required'],
    index: true,
  },
  
  // Feedback Content
  title: {
    type: String,
    required: [true, 'Feedback title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  
  description: {
    type: String,
    required: [true, 'Feedback description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  
  // Priority and Severity
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'critical'],
    default: 'moderate',
  },
  
  // Contact Information (for anonymous feedback)
  contact: {
    email: {
      type: String,
      validate: {
        validator: function(email) {
          if (!email) return true; // Optional field
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address'
      },
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
  },
  
  // Technical Information
  technical: {
    userAgent: String,
    browserInfo: {
      name: String,
      version: String,
      os: String,
    },
    screenResolution: String,
    url: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  
  // Attachments (screenshots, logs, etc.)
  attachments: [{
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: Number,
    mimeType: String,
    description: String,
  }],
  
  // Status and Processing
  status: {
    type: String,
    enum: [
      'submitted',
      'acknowledged',
      'in_progress',
      'resolved',
      'closed',
      'duplicate',
      'invalid'
    ],
    default: 'submitted',
    index: true,
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // Resolution
  resolution: {
    description: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    category: {
      type: String,
      enum: [
        'fixed',
        'implemented',
        'wont_fix',
        'duplicate',
        'not_reproducible',
        'by_design',
        'user_error'
      ],
    },
  },
  
  // Tags and Categories
  tags: [String],
  
  category: {
    type: String,
    enum: [
      'authentication',
      'file_upload',
      'ocr_processing',
      'ai_analysis',
      'user_interface',
      'performance',
      'security',
      'mobile',
      'integration',
      'other'
    ],
    default: 'other',
    index: true,
  },
  
  // Rating and Sentiment
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral',
  },
  
  // Internal Notes (admin only)
  internalNotes: [{
    note: {
      type: String,
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Follow-up Information
  followUp: {
    required: {
      type: Boolean,
      default: false,
    },
    scheduledFor: Date,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    sessionId: String,
    referrer: String,
    source: {
      type: String,
      enum: ['web', 'api', 'mobile', 'email'],
      default: 'web',
    },
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ priority: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ analysisId: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ status: 1, assignedTo: 1 });
feedbackSchema.index({ tags: 1 });
feedbackSchema.index({ createdAt: -1 });

// Virtual for age in days
feedbackSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Virtual for is resolved
feedbackSchema.virtual('isResolved').get(function() {
  return ['resolved', 'closed'].includes(this.status);
});

// Pre-save middleware to update sentiment based on rating
feedbackSchema.pre('save', function(next) {
  if (this.isModified('rating') && this.rating) {
    if (this.rating >= 4) {
      this.sentiment = 'positive';
    } else if (this.rating <= 2) {
      this.sentiment = 'negative';
    } else {
      this.sentiment = 'neutral';
    }
  }
  next();
});

// Instance method to update status
feedbackSchema.methods.updateStatus = async function(newStatus, userId = null) {
  this.status = newStatus;
  
  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolution.resolvedAt = new Date();
    if (userId) {
      this.resolution.resolvedBy = userId;
    }
  }
  
  return this.save();
};

// Instance method to assign feedback
feedbackSchema.methods.assignTo = async function(userId) {
  this.assignedTo = userId;
  if (this.status === 'submitted') {
    this.status = 'acknowledged';
  }
  return this.save();
};

// Instance method to add internal note
feedbackSchema.methods.addInternalNote = async function(note, userId) {
  this.internalNotes.push({
    note,
    addedBy: userId,
    addedAt: new Date(),
  });
  return this.save();
};

// Static method to find by user
feedbackSchema.statics.findByUser = function(userId, limit = 10, offset = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('analysisId', 'aiAnalysis.subject status');
};

// Static method to find by status
feedbackSchema.statics.findByStatus = function(status, limit = 10, offset = 0) {
  return this.find({ status })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('userId', 'name email')
    .populate('assignedTo', 'name email');
};

// Static method to get feedback stats
feedbackSchema.statics.getFeedbackStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      }
    }
  ]);
  
  const typeStats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      }
    }
  ]);
  
  const avgRating = await this.aggregate([
    {
      $match: { rating: { $ne: null } }
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
      }
    }
  ]);
  
  return {
    statusStats: stats,
    typeStats: typeStats,
    avgRating: avgRating[0]?.avgRating || 0,
    totalRatings: avgRating[0]?.totalRatings || 0,
  };
};

export default mongoose.model('Feedback', feedbackSchema);