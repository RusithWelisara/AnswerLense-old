const pdf = require('pdf-parse');
const sharp = require('sharp');
const logger = require('./logger');

class FileProcessor {
  constructor() {
    this.supportedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 20971520; // 20MB
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (!this.supportedTypes.includes(fileExtension)) {
      errors.push(`Unsupported file type. Supported types: ${this.supportedTypes.join(', ')}`);
    }

    // Check MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid MIME type: ${file.mimetype}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileType: fileExtension
    };
  }

  /**
   * Process PDF file and extract images
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Array<Buffer>>} Array of image buffers
   */
  async processPDF(pdfBuffer) {
    try {
      logger.info('Processing PDF file');

      // First, try to extract text directly from PDF
      const pdfData = await pdf(pdfBuffer);
      
      if (pdfData.text && pdfData.text.trim().length > 100) {
        logger.info('PDF contains extractable text, using direct extraction');
        return {
          method: 'direct',
          text: pdfData.text,
          pageCount: pdfData.numpages
        };
      }

      logger.info('PDF requires OCR processing, converting to images');
      
      // If no text or insufficient text, convert PDF to images for OCR
      const images = await this.convertPDFToImages(pdfBuffer);
      
      return {
        method: 'ocr',
        images,
        pageCount: images.length
      };

    } catch (error) {
      logger.error('PDF processing failed:', error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Convert PDF to images for OCR processing
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Array<Buffer>>} Array of image buffers
   */
  async convertPDFToImages(pdfBuffer) {
    try {
      // Note: This is a simplified implementation
      // In production, you might want to use pdf2pic or similar library
      // For now, we'll return the PDF buffer as-is and handle it in OCR
      logger.warn('PDF to image conversion not fully implemented, using alternative method');
      
      // This is a placeholder - in production you would use:
      // const pdf2pic = require('pdf2pic');
      // const convert = pdf2pic.fromBuffer(pdfBuffer, { density: 300, format: 'png' });
      // const results = await convert.bulk(-1);
      // return results.map(result => result.buffer);
      
      return [pdfBuffer]; // Temporary fallback
    } catch (error) {
      logger.error('PDF to image conversion failed:', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Process image file
   * @param {Buffer} imageBuffer - Image file buffer
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async processImage(imageBuffer) {
    try {
      logger.info('Processing image file');

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      logger.info(`Image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Optimize image for OCR
      const processedImage = await sharp(imageBuffer)
        .resize(null, 2000, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .png()
        .toBuffer();

      return processedImage;

    } catch (error) {
      logger.error('Image processing failed:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Get file information
   * @param {Object} file - Multer file object
   * @returns {Object} File information
   */
  getFileInfo(file) {
    return {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      extension: file.originalname.split('.').pop().toLowerCase(),
      uploadedAt: new Date()
    };
  }

  /**
   * Clean up temporary files
   * @param {Array<string>} filePaths - Array of file paths to clean up
   */
  async cleanupFiles(filePaths) {
    const fs = require('fs').promises;
    
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.info(`Cleaned up temporary file: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to cleanup file ${filePath}:`, error.message);
      }
    }
  }
}

module.exports = new FileProcessor();