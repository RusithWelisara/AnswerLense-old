import express from 'express';
import morgan from 'morgan';
import environment from './config/environment.js';
import database from './config/database.js';
import { corsHandler } from './middleware/cors.js';
import { securityMiddleware, additionalSecurityHeaders } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';

/**
 * Express server setup and initialization
 * Main entry point for the application
 */

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(securityMiddleware);
app.use(additionalSecurityHeaders);

// CORS middleware
app.use(corsHandler);

// Rate limiting
app.use(generalLimiter);

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

/**
 * Start the server
 */
async function startServer() {
  try {
    // Connect to database first
    await database.connect();
    
    // Start the server
    const server = app.listen(environment.PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${environment.PORT} in ${environment.NODE_ENV} mode`);
      logger.info(`Health check: http://localhost:${environment.PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed.');
        await database.disconnect();
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;