import 'dotenv/config';
import app from './app.js';
import connectDB from './config/database.js';
import fileProcessor from './utils/fileProcessor.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  logger.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Connect to database
connectDB();

// Ensure upload directory exists
fileProcessor.ensureUploadDir().catch(error => {
  logger.error('Failed to create upload directory:', error);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`AnswerLense API Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  
  // Log configuration (without sensitive data)
  logger.info('Configuration:', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoConnected: true,
    corsOrigins: [
      process.env.FRONTEND_URL,
      process.env.DEV_FRONTEND_URL
    ].filter(Boolean)
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Cleanup old files periodically (every 6 hours)
setInterval(() => {
  fileProcessor.cleanupOldFiles(24).catch(error => {
    logger.error('File cleanup failed:', error);
  });
}, 6 * 60 * 60 * 1000);

export default server;