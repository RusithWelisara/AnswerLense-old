const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const logger = require('./logger');

class OCRProcessor {
  constructor() {
    this.supportedLanguages = ['eng', 'spa', 'fra', 'deu', 'ita', 'por'];
  }

  /**
   * Process image with OCR
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} language - OCR language (default: 'eng')
   * @returns {Promise<string>} Extracted text
   */
  async processImage(imageBuffer, language = 'eng') {
    const startTime = Date.now();
    
    try {
      // Validate language
      if (!this.supportedLanguages.includes(language)) {
        logger.warn(`Unsupported language: ${language}, falling back to English`);
        language = 'eng';
      }

      // Preprocess image for better OCR accuracy
      const processedImage = await this.preprocessImage(imageBuffer);

      logger.info(`Starting OCR processing with language: ${language}`);

      // Perform OCR with retry mechanism
      const result = await this.performOCRWithRetry(processedImage, language);
      
      const processingTime = Date.now() - startTime;
      logger.info(`OCR completed in ${processingTime}ms`);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`OCR processing failed after ${processingTime}ms:`, error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async preprocessImage(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(null, 2000, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()
        .sharpen()
        .greyscale()
        .png()
        .toBuffer();
    } catch (error) {
      logger.warn('Image preprocessing failed, using original:', error.message);
      return imageBuffer;
    }
  }

  /**
   * Perform OCR with retry mechanism
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} language - OCR language
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} OCR result
   */
  async performOCRWithRetry(imageBuffer, language, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`OCR attempt ${attempt}/${maxRetries}`);

        const result = await Tesseract.recognize(imageBuffer, language, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        // Check if we got reasonable results
        if (result.data.text.trim().length < 10) {
          throw new Error('OCR returned insufficient text');
        }

        return result;

      } catch (error) {
        lastError = error;
        logger.warn(`OCR attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Clean extracted text by removing common OCR artifacts
   * @param {string} text - Raw OCR text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove common page artifacts
      .replace(/Page \d+/gi, '')
      .replace(/^\d+\s*$/gm, '') // Remove standalone numbers (page numbers)
      // Remove watermarks and headers/footers
      .replace(/CONFIDENTIAL|DRAFT|COPY/gi, '')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Clean up punctuation
      .replace(/([.!?])\s*\n+\s*([A-Z])/g, '$1 $2')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Process multiple images (for multi-page documents)
   * @param {Array<Buffer>} imageBuffers - Array of image buffers
   * @param {string} language - OCR language
   * @returns {Promise<Object>} Combined OCR results
   */
  async processMultipleImages(imageBuffers, language = 'eng') {
    const startTime = Date.now();
    const results = [];
    let totalConfidence = 0;

    try {
      logger.info(`Processing ${imageBuffers.length} images with OCR`);

      // Process images in parallel with concurrency limit
      const concurrencyLimit = 3;
      const chunks = [];
      
      for (let i = 0; i < imageBuffers.length; i += concurrencyLimit) {
        chunks.push(imageBuffers.slice(i, i + concurrencyLimit));
      }

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (buffer, index) => {
          const pageNumber = results.length + index + 1;
          logger.info(`Processing page ${pageNumber}`);
          
          const result = await this.processImage(buffer, language);
          return {
            pageNumber,
            text: result.text,
            confidence: result.confidence,
            processingTime: result.processingTime
          };
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      // Calculate average confidence
      totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0) / results.length;

      // Combine all text
      const combinedText = results.map(result => result.text).join('\n\n');
      const cleanedText = this.cleanText(combinedText);

      const totalProcessingTime = Date.now() - startTime;

      logger.info(`Multi-page OCR completed in ${totalProcessingTime}ms with average confidence: ${totalConfidence.toFixed(2)}%`);

      return {
        text: combinedText,
        cleanedText,
        confidence: totalConfidence,
        pageCount: results.length,
        processingTime: totalProcessingTime,
        pageResults: results
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      logger.error(`Multi-page OCR processing failed after ${totalProcessingTime}ms:`, error);
      throw error;
    }
  }
}

module.exports = new OCRProcessor();