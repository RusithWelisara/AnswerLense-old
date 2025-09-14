const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  // File information
  originalFilename: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'jpg', 'jpeg', 'png']
  },
  fileSize: {
    type: Number,
    required: true
  },
  
  // Processing information
  extractedText: {
    type: String,
    required: true
  },
  cleanedText: {
    type: String,
    required: true
  },
  pageCount: {
    type: Number,
    default: 1
  },
  
  // AI Analysis results
  analysis: {
    type: String,
    required: true
  },
  suggestions: [{
    category: String,
    content: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  
  // Metadata
  processingTime: {
    type: Number, // in milliseconds
    required: true
  },
  aiModel: {
    type: String,
    default: 'gpt-4'
  },
  language: {
    type: String,
    default: 'eng'
  },
  
  // User interaction
  userFeedback: [{
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // System fields
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
analysisSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
analysisSchema.index({ createdAt: -1 });
analysisSchema.index({ ipAddress: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);