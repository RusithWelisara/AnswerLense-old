import mongoose from 'mongoose';

const apiLogSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  endpoint: {
    type: String,
    required: true,
    maxlength: 200
  },
  ipAddress: {
    type: String,
    required: true,
    maxlength: 45
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number, // in milliseconds
    required: true
  },
  fileSize: {
    type: Number // for upload endpoints
  },
  errorMessage: {
    type: String,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// TTL index - automatically delete logs older than 30 days
apiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Index for analytics
apiLogSchema.index({ endpoint: 1, timestamp: -1 });
apiLogSchema.index({ ipAddress: 1, timestamp: -1 });

export default mongoose.model('ApiLog', apiLogSchema);