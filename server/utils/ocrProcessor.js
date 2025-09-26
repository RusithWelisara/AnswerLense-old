import Tesseract from 'tesseract.js';
import { logger } from './logger.js';

class OCRProcessor {
  constructor() {
    this.maxRetries = 3;
    this.languages = 'eng'; // Default to English, can be extended
  }

  /**
   * Process image with OCR
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} OCR result with text and confidence
   */
  async processImage(imageBuffer, options = {}) {
    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        logger.info(`OCR attempt ${attempt + 1} for image processing`);

        const result = await Tesseract.recognize(imageBuffer, this.languages, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          ...options
        });

        const processingTime = Date.now() - startTime;
        const cleanedText = this.cleanText(result.data.text);
        const confidence = result.data.confidence;

        logger.info(`OCR completed in ${processingTime}ms with confidence: ${confidence}%`);

        return {
          text: cleanedText,
          confidence: confidence,
          processingTime: processingTime,
          rawText: result.data.text,
          success: true
        };

      } catch (error) {
        attempt++;
        logger.error(`OCR attempt ${attempt} failed:`, error);

        if (attempt >= this.maxRetries) {
          return {
            text: '',
            confidence: 0,
            processingTime: Date.now() - startTime,
            error: error.message,
            success: false
          };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Clean extracted text by removing common artifacts
   * @param {string} text - Raw OCR text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';

    let cleaned = text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove common page artifacts
      .replace(/Page \d+/gi, '')
      .replace(/^\d+\s*$/gm, '') // Remove standalone numbers (page numbers)
      // Remove common headers/footers patterns
      .replace(/^[-=_]{3,}$/gm, '')
      // Remove watermark-like patterns
      .replace(/CONFIDENTIAL|DRAFT|COPY/gi, '')
      // Clean up line breaks
      .replace(/\n\s*\n/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim();

    // Remove very short lines that are likely artifacts
    cleaned = cleaned
      .split('\n')
      .filter(line => line.trim().length > 2 || /[.!?]$/.test(line.trim()))
      .join('\n');

    return cleaned;
  }

  /**
   * Process multiple images (for PDF pages)
   * @param {Array<Buffer>} imageBuffers - Array of image buffers
   * @returns {Promise<Object>} Combined OCR results
   */
  async processMultipleImages(imageBuffers) {
    const results = [];
    let totalConfidence = 0;
    let totalProcessingTime = 0;

    logger.info(`Processing ${imageBuffers.length} images with OCR`);

    for (let i = 0; i < imageBuffers.length; i++) {
      logger.info(`Processing page ${i + 1}/${imageBuffers.length}`);
      
      const result = await this.processImage(imageBuffers[i]);
      results.push(result);
      
      if (result.success) {
        totalConfidence += result.confidence;
        totalProcessingTime += result.processingTime;
      }
    }

    const successfulResults = results.filter(r => r.success);
    const combinedText = successfulResults.map(r => r.text).join('\n\n');
    const averageConfidence = successfulResults.length > 0 
      ? totalConfidence / successfulResults.length 
      : 0;

    return {
      text: combinedText,
      confidence: averageConfidence,
      processingTime: totalProcessingTime,
      pageResults: results,
      successfulPages: successfulResults.length,
      totalPages: imageBuffers.length,
      success: successfulResults.length > 0
    };
  }
}

export default new OCRProcessor();