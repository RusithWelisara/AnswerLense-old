import mongoose from 'mongoose';

/**
 * Analysis model for storing AI analysis results
 * Handles OCR text extraction and AI-generated content analysis
 */

const analysisSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  
  // File Information
  fileInfo: {
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
    },
    fileName: {
      type: String,
      required: [true, 'Stored file name is required'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    fileHash: {
      type: String,
      required: true,
      index: true, // For duplicate detection
    },
  },
  
  // OCR Results
  ocr: {
    extractedText: {
      type: String,
      required: [true, 'Extracted text is required'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    language: {
      type: String,
      default: 'eng',
    },
    processingTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    boundingBoxes: [{
      text: String,
      confidence: Number,
      bbox: {
        x0: Number,
        y0: Number,
        x1: Number,
        y1: Number,
      },
    }],
  },
  
  // AI Analysis Results
  aiAnalysis: {
    // Subject and difficulty provided by user
    subject: {
      type: String,
      enum: [
        'mathematics',
        'physics',
        'chemistry',
        'biology',
        'computer_science',
        'history',
        'literature',
        'geography',
        'economics',
        'psychology',
        'general',
        'other'
      ],
      default: 'general',
    },
    
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate',
    },
    
    // AI-generated content
    summary: {
      type: String,
      required: [true, 'Analysis summary is required'],
    },
    
    explanations: [{
      id: {
        type: String,
        required: true,
      },
      topic: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
      type: {
        type: String,
        enum: [
          'concept_explanation',
          'solution_steps',
          'related_topics',
          'practical_application',
          'historical_context',
          'key_points'
        ],
        required: true,
      },
    }],
    
    insights: [String],
    
    studyTips: [String],
    
    relatedConcepts: [String],
    
    // AI model information
    model: {
      type: String,
      required: [true, 'AI model name is required'],
    },
    
    modelVersion: {
      type: String,
      default: 'latest',
    },
    
    processingTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    
    tokensUsed: {
      input: {
        type: Number,
        default: 0,
      },
      output: {
        type: Number,
        default: 0,
      },
    },
  },
  
  // Analysis Status
  status: {
    type: String,
    enum: [
      'pending',
      'processing_ocr',
      'processing_ai',
      'completed',
      'failed',
      'cancelled'
    ],
    default: 'pending',
    index: true,
  },
  
  // Error Information
  error: {
    message: String,
    code: String,
    stage: {
      type: String,
      enum: ['upload', 'ocr', 'ai_analysis'],
    },
    details: mongoose.Schema.Types.Mixed,
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    processingNode: String,
  },
  
  // Quality Metrics
  quality: {
    ocrAccuracy: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    analysisRelevance: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    userRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedback: String,
  },
  
  // Sharing and Privacy
  isPublic: {
    type: Boolean,
    default: false,
  },
  
  shareToken: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
  },
  
  tags: [String],
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ 'aiAnalysis.subject': 1 });
analysisSchema.index({ 'fileInfo.fileHash': 1 });
analysisSchema.index({ shareToken: 1 });
analysisSchema.index({ createdAt: -1 });
analysisSchema.index({ tags: 1 });

// Virtual for word count
analysisSchema.virtual('wordCount').get(function() {
  if (!this.ocr?.extractedText) return 0;
  return this.ocr.extractedText.split(/\s+/).filter(word => word.length > 0).length;
});

// Virtual for processing duration
analysisSchema.virtual('totalProcessingTime').get(function() {
  const ocrTime = this.ocr?.processingTime || 0;
  const aiTime = this.aiAnalysis?.processingTime || 0;
  return ocrTime + aiTime;
});

// Pre-save middleware to generate share token if public
analysisSchema.pre('save', function(next) {
  if (this.isPublic && !this.shareToken) {
    this.shareToken = this._id.toString() + Date.now().toString(36);
  } else if (!this.isPublic) {
    this.shareToken = undefined;
  }
  next();
});

// Instance method to update status
analysisSchema.methods.updateStatus = async function(newStatus, errorInfo = null) {
  this.status = newStatus;
  if (errorInfo) {
    this.error = errorInfo;
  }
  return this.save();
};

// Instance method to add rating
analysisSchema.methods.addRating = async function(rating, feedback = null) {
  this.quality.userRating = rating;
  if (feedback) {
    this.quality.feedback = feedback;
  }
  return this.save();
};

// Static method to find by user
analysisSchema.statics.findByUser = function(userId, limit = 10, offset = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('userId', 'name email');
};

// Static method to find public analyses
analysisSchema.statics.findPublic = function(limit = 10, offset = 0) {
  return this.find({ isPublic: true, status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('userId', 'name');
};

// Static method to get analysis stats
analysisSchema.statics.getAnalysisStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        completedAnalyses: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failedAnalyses: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgProcessingTime: { $avg: '$totalProcessingTime' },
        avgRating: { $avg: '$quality.userRating' },
      }
    }
  ]);
  
  return stats[0] || {
    totalAnalyses: 0,
    completedAnalyses: 0,
    failedAnalyses: 0,
    avgProcessingTime: 0,
    avgRating: 0,
  };
};

export default mongoose.model('Analysis', analysisSchema);