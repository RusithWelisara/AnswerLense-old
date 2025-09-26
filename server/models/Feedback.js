import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  feedback: {
    type: String,
    required: true,
    maxlength: 2000
  },
  categories: [{
    type: String,
    enum: ['accuracy', 'helpfulness', 'clarity', 'completeness', 'speed']
  }],
  userAgent: {
    type: String,
    maxlength: 500
  },
  ipAddress: {
    type: String,
    maxlength: 45 // IPv6 max length
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for analytics queries
feedbackSchema.index({ analysisId: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);