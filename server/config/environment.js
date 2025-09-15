import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Environment configuration
 * Validates and exports environment variables
 */

class EnvironmentConfig {
  constructor() {
    this.validateEnvironment();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = [
      'OPENAI_API_KEY',
      'JWT_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`Missing required environment variables: ${missing.join(', ')}`);
      console.error('Please check your .env file');
    }
  }

  // Server Configuration
  get PORT() {
    return parseInt(process.env.PORT) || 3001;
  }

  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  }

  get FRONTEND_URL() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  // Database Configuration
  get MONGODB_URI() {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/answerlens';
  }

  // Security Configuration
  get JWT_SECRET() {
    return process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  }

  get JWT_EXPIRES_IN() {
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  // API Configuration
  get OPENAI_API_KEY() {
    return process.env.OPENAI_API_KEY;
  }

  get OPENAI_MODEL() {
    return process.env.OPENAI_MODEL || 'gpt-5';
  }

  // File Upload Configuration
  get MAX_FILE_SIZE() {
    return parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024; // 20MB
  }

  get UPLOAD_DIR() {
    return process.env.UPLOAD_DIR || 'uploads';
  }

  // Rate Limiting Configuration
  get RATE_LIMIT_WINDOW() {
    return parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000; // 15 minutes
  }

  get RATE_LIMIT_MAX_REQUESTS() {
    return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
  }

  // Logging Configuration
  get LOG_LEVEL() {
    return process.env.LOG_LEVEL || 'info';
  }

  get LOG_FILE() {
    return process.env.LOG_FILE || 'logs/app.log';
  }

  /**
   * Check if running in production
   * @returns {boolean}
   */
  isProduction() {
    return this.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   * @returns {boolean}
   */
  isDevelopment() {
    return this.NODE_ENV === 'development';
  }

  /**
   * Get all configuration as object
   * @returns {object}
   */
  getConfig() {
    return {
      port: this.PORT,
      nodeEnv: this.NODE_ENV,
      frontendUrl: this.FRONTEND_URL,
      mongoUri: this.MONGODB_URI,
      jwtSecret: this.JWT_SECRET,
      jwtExpiresIn: this.JWT_EXPIRES_IN,
      openaiApiKey: this.OPENAI_API_KEY,
      openaiModel: this.OPENAI_MODEL,
      maxFileSize: this.MAX_FILE_SIZE,
      uploadDir: this.UPLOAD_DIR,
      rateLimitWindow: this.RATE_LIMIT_WINDOW,
      rateLimitMaxRequests: this.RATE_LIMIT_MAX_REQUESTS,
      logLevel: this.LOG_LEVEL,
      logFile: this.LOG_FILE,
    };
  }
}

export default new EnvironmentConfig();