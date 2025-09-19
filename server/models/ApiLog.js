const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number, // in milliseconds
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  requestBody: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries and automatic cleanup
apiLogSchema.index({ timestamp: -1 });
apiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('ApiLog', apiLogSchema);