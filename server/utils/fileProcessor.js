import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './logger.js';
import environment from '../config/environment.js';

/**
 * File processing utility for handling file uploads, validation, and cleanup
 * Manages file operations securely and efficiently
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FileProcessor {
  constructor() {
    this.uploadDir = path.resolve(environment.UPLOAD_DIR);
    this.maxFileSize = environment.MAX_FILE_SIZE;
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'application/pdf',
    ];
    this.allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.pdf'];
    
    // Magic numbers (file signatures) for validation
    this.magicNumbers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/bmp': [0x42, 0x4D],
      'image/tiff': [0x49, 0x49, 0x2A, 0x00], // Little endian
      'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
      'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    };
    
    // Note: Directory creation is now handled in ensureUploadDirectory() method
    // and called before file operations to avoid constructor race conditions
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      logger.info(`Creating upload directory: ${this.uploadDir}`);
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Validate file magic numbers (file signatures)
   * @param {string} filePath - Path to the file
   * @param {string} expectedMimeType - Expected MIME type
   * @returns {Promise<boolean>} True if file signature matches
   */
  async validateMagicNumbers(filePath, expectedMimeType) {
    try {
      const expectedSignature = this.magicNumbers[expectedMimeType];
      if (!expectedSignature) {
        logger.warn(`No magic number defined for MIME type: ${expectedMimeType}`);
        return true; // Allow if no signature defined
      }

      const buffer = Buffer.alloc(expectedSignature.length);
      const fd = await fs.open(filePath, 'r');
      try {
        await fd.read(buffer, 0, expectedSignature.length, 0);
        
        // Special handling for WebP (check for WEBP in bytes 8-11)
        if (expectedMimeType === 'image/webp') {
          const webpBuffer = Buffer.alloc(4);
          await fd.read(webpBuffer, 0, 4, 8);
          const webpSignature = [0x57, 0x45, 0x42, 0x50]; // WEBP
          return buffer.every((byte, i) => byte === expectedSignature[i]) &&
                 webpBuffer.every((byte, i) => byte === webpSignature[i]);
        }
        
        // Check if file signature matches
        return buffer.every((byte, i) => byte === expectedSignature[i]);
      } finally {
        await fd.close();
      }
    } catch (error) {
      logger.error(`Magic number validation failed for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  async validateFile(file) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      fileInfo: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).toLowerCase(),
      },
    };

    // Check file size
    if (file.size > this.maxFileSize) {
      validation.isValid = false;
      validation.errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      validation.isValid = false;
      validation.errors.push(`File extension '${ext}' is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      validation.isValid = false;
      validation.errors.push(`File type '${file.mimetype}' is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.originalname)) {
      validation.isValid = false;
      validation.errors.push('File name contains suspicious characters');
    }

    // Validate magic numbers for security (requires file path)
    if (file.path) {
      try {
        const isValidSignature = await this.validateMagicNumbers(file.path, file.mimetype);
        if (!isValidSignature) {
          validation.isValid = false;
          validation.errors.push('File signature does not match the declared file type');
        }
      } catch (error) {
        validation.warnings.push('Could not validate file signature');
      }
    }

    // Warnings for edge cases
    if (file.size < 1024) {
      validation.warnings.push('File is very small, which may indicate poor quality');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      validation.warnings.push('Large file may take longer to process');
    }

    return validation;
  }

  /**
   * Check if filename is suspicious
   * @param {string} filename - Original filename
   * @returns {boolean} True if suspicious
   */
  isSuspiciousFileName(filename) {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return true;
    }

    // Check for executable extensions
    const dangerousExts = ['.exe', '.bat', '.cmd', '.com', '.scr', '.sh', '.js', '.php', '.asp'];
    const ext = path.extname(filename).toLowerCase();
    if (dangerousExts.includes(ext)) {
      return true;
    }

    // Check for null bytes or control characters
    if (/[\x00-\x1F\x7F]/.test(filename)) {
      return true;
    }

    return false;
  }

  /**
   * Generate secure filename
   * @param {string} originalName - Original filename
   * @returns {string} Secure filename
   */
  generateSecureFileName(originalName) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Calculate file hash for duplicate detection
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} File hash
   */
  async calculateFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error(`Failed to calculate hash for ${filePath}:`, error);
      throw new Error('Failed to calculate file hash');
    }
  }

  /**
   * Move uploaded file to secure location
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} File information
   */
  async processUploadedFile(file) {
    try {
      // Ensure upload directory exists before processing
      await this.ensureUploadDirectory();
      
      // Validate file first
      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate secure filename
      const secureFileName = this.generateSecureFileName(file.originalname);
      const targetPath = path.join(this.uploadDir, secureFileName);

      // Move file to secure location
      await fs.rename(file.path, targetPath);

      // Calculate file hash
      const fileHash = await this.calculateFileHash(targetPath);

      // Get file stats
      const stats = await fs.stat(targetPath);

      const fileInfo = {
        originalName: file.originalname,
        fileName: secureFileName,
        filePath: targetPath,
        fileSize: stats.size,
        mimeType: file.mimetype,
        fileHash: fileHash,
        uploadedAt: new Date(),
        validation: validation,
      };

      logger.info(`File processed successfully: ${secureFileName} (${this.formatFileSize(stats.size)})`);

      return fileInfo;

    } catch (error) {
      // Clean up original file if it still exists
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        logger.warn('Failed to clean up original file:', cleanupError);
      }

      logger.error('File processing failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old files based on age or storage limits
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupOldFiles(options = {}) {
    const {
      maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      maxFiles = 1000,
      dryRun = false,
    } = options;

    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      let deletedCount = 0;
      let freedSpace = 0;

      // Get file stats and sort by modification time
      const fileStats = [];
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        try {
          const stats = await fs.stat(filePath);
          fileStats.push({
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime.getTime(),
            age: now - stats.mtime.getTime(),
          });
        } catch (error) {
          logger.warn(`Failed to get stats for ${file}:`, error);
        }
      }

      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);

      // Delete files based on age
      for (const fileInfo of fileStats) {
        if (fileInfo.age > maxAge) {
          if (!dryRun) {
            await fs.unlink(fileInfo.path);
          }
          deletedCount++;
          freedSpace += fileInfo.size;
          logger.info(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} old file: ${fileInfo.name} (age: ${Math.round(fileInfo.age / (24 * 60 * 60 * 1000))} days)`);
        }
      }

      // Delete excess files if over limit
      const remainingFiles = fileStats.filter(f => f.age <= maxAge);
      if (remainingFiles.length > maxFiles) {
        const excessFiles = remainingFiles.slice(0, remainingFiles.length - maxFiles);
        for (const fileInfo of excessFiles) {
          if (!dryRun) {
            await fs.unlink(fileInfo.path);
          }
          deletedCount++;
          freedSpace += fileInfo.size;
          logger.info(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} excess file: ${fileInfo.name}`);
        }
      }

      const result = {
        totalFiles: fileStats.length,
        deletedCount,
        freedSpace: this.formatFileSize(freedSpace),
        remainingFiles: fileStats.length - deletedCount,
      };

      logger.info(`Cleanup completed: ${deletedCount} files deleted, ${result.freedSpace} freed`);
      return result;

    } catch (error) {
      logger.error('File cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      const files = await fs.readdir(this.uploadDir);
      let totalSize = 0;
      let fileCount = 0;
      const fileTypes = {};

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          fileCount++;

          const ext = path.extname(file).toLowerCase();
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        } catch (error) {
          logger.warn(`Failed to get stats for ${file}:`, error);
        }
      }

      return {
        totalFiles: fileCount,
        totalSize: this.formatFileSize(totalSize),
        totalSizeBytes: totalSize,
        fileTypes,
        uploadDir: this.uploadDir,
        maxFileSize: this.formatFileSize(this.maxFileSize),
        allowedTypes: this.allowedMimeTypes,
      };

    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Delete specific file
   * @param {string} fileName - Name of file to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileName) {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      
      // Security check - ensure file is within upload directory
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(this.uploadDir);
      
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        throw new Error('Invalid file path - security violation');
      }

      await fs.unlink(filePath);
      logger.info(`File deleted: ${fileName}`);
      return true;

    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found for deletion: ${fileName}`);
        return false;
      }
      logger.error(`Failed to delete file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Check if file exists
   * @param {string} fileName - Name of file to check
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(fileName) {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file information
   * @param {string} fileName - Name of file
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(fileName) {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      const stats = await fs.stat(filePath);
      
      return {
        fileName: fileName,
        filePath: filePath,
        size: stats.size,
        formattedSize: this.formatFileSize(stats.size),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        extension: path.extname(fileName),
      };

    } catch (error) {
      logger.error(`Failed to get file info for ${fileName}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance for convenience
const fileProcessor = new FileProcessor();

export default fileProcessor;
export { FileProcessor };