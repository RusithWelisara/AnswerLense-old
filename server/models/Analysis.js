import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  originalText: {
    type: String,
    required: true,
    maxlength: 50000
  },
  analysis: {
    type: String,
    required: true,
    maxlength: 20000
  },
  suggestions: [{
    category: {
      type: String,
      enum: ['grammar', 'clarity', 'structure', 'content', 'formatting'],
      required: true
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    suggestion: {
      type: String,
      required: true,
      maxlength: 1000
    },
    location: {
      type: String,
      maxlength: 200
    }
  }],
  metadata: {
    fileType: {
      type: String,
      enum: ['pdf', 'jpg', 'jpeg', 'png'],
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    pageCount: {
      type: Number,
      default: 1
    },
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100
    },
    processingTime: {
      type: Number // in milliseconds
    }
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
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
analysisSchema.index({ status: 1 });

export default mongoose.model('Analysis', analysisSchema);