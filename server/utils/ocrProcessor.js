import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

/**
 * OCR (Optical Character Recognition) processing utility
 * Handles text extraction from images using Tesseract.js
 */

class OCRProcessor {
  constructor() {
    this.supportedLanguages = [
      'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor'
    ];
    this.defaultOptions = {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    };
    this.languageDetectionTimeout = 30000; // 30 seconds max for language detection
    this.singleLanguageTimeout = 10000; // 10 seconds per language
  }

  /**
   * Extract text from image file
   * @param {string} filePath - Path to the image file
   * @param {Object} options - OCR processing options
   * @returns {Promise<Object>} OCR result with extracted text and metadata
   */
  async extractText(filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate file exists
      await fs.access(filePath);
      
      // Set up OCR options
      const ocrOptions = {
        ...this.defaultOptions,
        ...options,
      };
      
      // Set language (default to English)
      const language = options.language || 'eng';
      if (!this.supportedLanguages.includes(language)) {
        logger.warn(`Unsupported language: ${language}, falling back to English`);
        ocrOptions.language = 'eng';
      } else {
        ocrOptions.language = language;
      }
      
      logger.info(`Starting OCR processing for file: ${path.basename(filePath)}`);
      
      // Perform OCR recognition
      const result = await Tesseract.recognize(filePath, language, ocrOptions);
      
      const processingTime = Date.now() - startTime;
      
      // Extract bounding boxes for individual words
      const boundingBoxes = this.extractBoundingBoxes(result.data);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(result.data);
      
      // Clean extracted text
      const cleanedText = this.cleanExtractedText(result.data.text);
      
      const ocrResult = {
        extractedText: cleanedText,
        confidence: confidence,
        language: language,
        processingTime: processingTime,
        boundingBoxes: boundingBoxes,
        metadata: {
          totalWords: result?.data?.words?.length || 0,
          totalLines: result?.data?.lines?.length || 0,
          totalParagraphs: result?.data?.paragraphs?.length || 0,
          imageInfo: {
            width: result?.data?.width || 0,
            height: result?.data?.height || 0,
          },
        },
      };
      
      logger.info(`OCR completed in ${processingTime}ms with confidence: ${(confidence * 100).toFixed(1)}%`);
      
      return ocrResult;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`OCR processing failed for ${filePath}:`, error);
      
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract bounding boxes for words with confidence scores
   * @param {Object} tesseractData - Raw Tesseract data
   * @returns {Array} Array of bounding box objects
   */
  extractBoundingBoxes(tesseractData) {
    if (!tesseractData || !tesseractData.words) return [];
    
    return tesseractData.words
      .filter(word => word && word.confidence > 30) // Filter out low-confidence words and null entries
      .map(word => ({
        text: word.text || '',
        confidence: (word.confidence || 0) / 100, // Convert to 0-1 scale
        bbox: {
          x0: word.bbox?.x0 || 0,
          y0: word.bbox?.y0 || 0,
          x1: word.bbox?.x1 || 0,
          y1: word.bbox?.y1 || 0,
        },
      }));
  }

  /**
   * Calculate overall confidence score
   * @param {Object} tesseractData - Raw Tesseract data
   * @returns {number} Confidence score between 0 and 1
   */
  calculateOverallConfidence(tesseractData) {
    if (!tesseractData || !tesseractData.words || tesseractData.words.length === 0) {
      return 0;
    }
    
    const validWords = tesseractData.words.filter(word => word && word.confidence > 0);
    if (validWords.length === 0) return 0;
    
    const totalConfidence = validWords.reduce((sum, word) => sum + (word.confidence || 0), 0);
    return (totalConfidence / validWords.length) / 100; // Convert to 0-1 scale
  }

  /**
   * Clean and normalize extracted text
   * @param {string} rawText - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanExtractedText(rawText) {
    if (!rawText) return '';
    
    return rawText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove non-printable characters except newlines and tabs
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      // REMOVED: Naive digit substitution that corrupts numbers
      // Previously: .replace(/\b0\b/g, 'O') and .replace(/\b1\b/g, 'I')
      // These substitutions corrupt mathematical content and data
      
      // Fix specific OCR character errors in non-numeric contexts only
      .replace(/([A-Za-z])0([A-Za-z])/g, '$1O$2') // 0 between letters -> O
      .replace(/([A-Za-z])1([A-Za-z])/g, '$1I$2') // 1 between letters -> I
      
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove trailing whitespace
      .trim();
  }

  /**
   * Detect language of the text (with timeout limits)
   * @param {string} filePath - Path to the image file
   * @returns {Promise<string>} Detected language code
   */
  async detectLanguage(filePath) {
    const startTime = Date.now();
    
    try {
      // Quick OCR with multiple languages to detect which works best
      const languages = ['eng', 'spa', 'fra', 'deu'];
      let bestLanguage = 'eng';
      let bestConfidence = 0;
      
      for (const lang of languages) {
        // Check overall timeout
        if (Date.now() - startTime > this.languageDetectionTimeout) {
          logger.warn('Language detection timeout reached, using best result so far');
          break;
        }
        
        try {
          // Create a timeout promise for individual language detection
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Language detection timeout')), this.singleLanguageTimeout);
          });
          
          const recognitionPromise = Tesseract.recognize(filePath, lang, {
            logger: () => {}, // Suppress logging for language detection
          });
          
          const result = await Promise.race([recognitionPromise, timeoutPromise]);
          const confidence = this.calculateOverallConfidence(result?.data);
          
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestLanguage = lang;
          }
          
          // If we get high confidence, we can stop early
          if (confidence > 0.8) {
            logger.debug(`High confidence (${(confidence * 100).toFixed(1)}%) reached for ${lang}, stopping early`);
            break;
          }
          
        } catch (error) {
          logger.debug(`Language detection failed for ${lang}: ${error.message}`);
        }
      }
      
      const totalTime = Date.now() - startTime;
      logger.info(`Detected language: ${bestLanguage} with confidence: ${(bestConfidence * 100).toFixed(1)}% (${totalTime}ms)`);
      return bestLanguage;
      
    } catch (error) {
      logger.error('Language detection failed:', error);
      return 'eng'; // Default to English
    }
  }

  /**
   * Preprocess image for better OCR results
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @returns {Promise<string>} Path to preprocessed image
   */
  async preprocessImage(inputPath, outputPath) {
    // This is a placeholder for image preprocessing
    // In a real implementation, you might use Sharp or similar library
    // to enhance image quality, adjust contrast, resize, etc.
    
    try {
      // For now, just copy the file
      await fs.copyFile(inputPath, outputPath);
      return outputPath;
    } catch (error) {
      logger.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  /**
   * Get OCR processing statistics
   * @returns {Object} OCR statistics
   */
  getStats() {
    return {
      supportedLanguages: this.supportedLanguages,
      version: '5.1.1', // Tesseract.js version
      capabilities: [
        'text_extraction',
        'bounding_boxes',
        'confidence_scores',
        'multi_language',
      ],
    };
  }

  /**
   * Validate if file is suitable for OCR
   * @param {string} filePath - Path to the image file
   * @returns {Promise<Object>} Validation result
   */
  async validateForOCR(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'];
      
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        fileSize: stats.size,
        format: ext,
      };
      
      // Check file format
      if (!supportedFormats.includes(ext)) {
        validation.isValid = false;
        validation.errors.push(`Unsupported format: ${ext}`);
      }
      
      // Check file size (warn if very large)
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        validation.warnings.push('Large file size may slow down OCR processing');
      }
      
      // Check if file is very small
      if (stats.size < 1024) { // 1KB
        validation.warnings.push('Very small file size may indicate poor image quality');
      }
      
      return validation;
      
    } catch (error) {
      return {
        isValid: false,
        errors: [`File validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }
}

export default new OCRProcessor();