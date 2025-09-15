import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Database configuration and connection setup
 * Uses MongoDB via Mongoose ODM
 */

class DatabaseConfig {
  constructor() {
    this.mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/answerlens';
    this.options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      // For development, use in-memory MongoDB or skip connection if no MongoDB available
      if (this.mongoUri.includes('DATABASE_URL') || !this.mongoUri.startsWith('mongodb')) {
        logger.info('Skipping MongoDB connection - using in-memory storage for development');
        return;
      }
      await mongoose.connect(this.mongoUri, this.options);
      logger.info('Successfully connected to MongoDB');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', this.disconnect.bind(this));
      process.on('SIGTERM', this.disconnect.bind(this));

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  }

  /**
   * Get connection status
   * @returns {string}
   */
  getConnectionStatus() {
    return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  }
}

export default new DatabaseConfig();