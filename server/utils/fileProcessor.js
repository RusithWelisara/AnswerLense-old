import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileProcessor {
  constructor() {
    this.supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 20971520; // 20MB
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads/';
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];

    // Check file type
    if (!this.supportedTypes.includes(file.mimetype)) {
      errors.push(`Unsupported file type: ${file.mimetype}. Supported types: PDF, JPG, PNG`);
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${(this.maxFileSize / 1024 / 1024)}MB`);
    }

    // Check if file exists and is readable
    if (!file.buffer && !file.path) {
      errors.push('File data is missing or corrupted');
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        sizeFormatted: this.formatFileSize(file.size)
      }
    };
  }

  /**
   * Process uploaded file and extract images
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} Processing result with image buffers
   */
  async processFile(file) {
    try {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          fileInfo: validation.fileInfo
        };
      }

      logger.info(`Processing file: ${file.originalname} (${validation.fileInfo.sizeFormatted})`);

      let imageBuffers = [];
      let pageCount = 1;

      if (file.mimetype === 'application/pdf') {
        // For PDF files, we would need a PDF-to-image converter
        // For now, return an error as PDF processing requires additional dependencies
        return {
          success: false,
          errors: ['PDF processing not yet implemented. Please upload images (JPG, PNG) instead.'],
          fileInfo: validation.fileInfo
        };
      } else {
        // For image files, use the buffer directly
        imageBuffers = [file.buffer];
        pageCount = 1;
      }

      // Clean up temporary file if it exists
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          logger.warn('Failed to clean up temporary file:', error);
        }
      }

      return {
        success: true,
        imageBuffers,
        pageCount,
        fileInfo: {
          ...validation.fileInfo,
          type: this.getFileType(file.mimetype)
        }
      };

    } catch (error) {
      logger.error('File processing error:', error);
      return {
        success: false,
        errors: [`File processing failed: ${error.message}`],
        fileInfo: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      };
    }
  }

  /**
   * Get simplified file type from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} Simplified file type
   */
  getFileType(mimeType) {
    switch (mimeType) {
      case 'application/pdf':
        return 'pdf';
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      case 'image/png':
        return 'png';
      default:
        return 'unknown';
    }
  }

  /**
   * Format file size in human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create upload directory if it doesn't exist
   * @returns {Promise<void>}
   */
  async ensureUploadDir() {
    try {
      const uploadPath = path.join(__dirname, '../../', this.uploadDir);
      await fs.mkdir(uploadPath, { recursive: true });
      logger.info(`Upload directory ensured: ${uploadPath}`);
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
      throw error;
    }
  }

  /**
   * Clean up old temporary files
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {Promise<void>}
   */
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const uploadPath = path.join(__dirname, '../../', this.uploadDir);
      const files = await fs.readdir(uploadPath);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(uploadPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} old files from upload directory`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }
  }
}

export default new FileProcessor();