const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const fileProcessor = require('../utils/fileProcessor');
const ocrProcessor = require('../utils/ocrProcessor');
const aiProcessor = require('../utils/aiProcessor');
const Analysis = require('../models/Analysis');
const logger = require('../utils/logger');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20971520, // 20MB
    files: 1 // Only allow one file at a time
  },
  fileFilter: (req, file, cb) => {
    const validation = fileProcessor.validateFile(file);
    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join(', ')), false);
    }
  }
});

/**
 * POST /api/upload
 * Upload and analyze document
 */
router.post('/', uploadLimiter, upload.single('document'), async (req, res) => {
  const startTime = Date.now();
  let analysisId = null;

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        error: 'No file uploaded'
      });
    }

    logger.info(`Processing upload: ${req.file.originalname} (${req.file.size} bytes)`);

    // Validate file
    const validation = fileProcessor.validateFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        status: 'error',
        error: validation.errors.join(', ')
      });
    }

    // Get analysis options from request
    const { language = 'eng', documentType = 'academic document' } = req.body;

    let extractedText = '';
    let cleanedText = '';
    let pageCount = 1;
    let ocrResults = null;

    // Process file based on type
    if (validation.fileType === 'pdf') {
      const pdfResult = await fileProcessor.processPDF(req.file.buffer);
      
      if (pdfResult.method === 'direct') {
        // Direct text extraction from PDF
        extractedText = pdfResult.text;
        cleanedText = ocrProcessor.cleanText(extractedText);
        pageCount = pdfResult.pageCount;
        logger.info(`Extracted text directly from PDF (${pageCount} pages)`);
      } else {
        // OCR processing required
        ocrResults = await ocrProcessor.processMultipleImages(pdfResult.images, language);
        extractedText = ocrResults.text;
        cleanedText = ocrResults.cleanedText;
        pageCount = ocrResults.pageCount;
      }
    } else {
      // Image file processing
      const processedImage = await fileProcessor.processImage(req.file.buffer);
      ocrResults = await ocrProcessor.processImage(processedImage, language);
      extractedText = ocrResults.text;
      cleanedText = ocrProcessor.cleanText(extractedText);
    }

    // Validate extracted text
    if (!cleanedText || cleanedText.trim().length < 50) {
      return res.status(400).json({
        status: 'error',
        error: 'Insufficient text content extracted from document. Please ensure the document contains readable text.'
      });
    }

    logger.info(`Extracted ${cleanedText.length} characters of text`);

    // Analyze with AI
    const aiResults = await aiProcessor.analyzeDocument(cleanedText, {
      documentType,
      language
    });

    // Save analysis to database
    const analysis = new Analysis({
      originalFilename: req.file.originalname,
      fileType: validation.fileType,
      fileSize: req.file.size,
      extractedText,
      cleanedText,
      pageCount,
      analysis: aiResults.analysis,
      suggestions: aiResults.suggestions,
      processingTime: Date.now() - startTime,
      aiModel: 'gpt-4',
      language,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    const savedAnalysis = await analysis.save();
    analysisId = savedAnalysis._id;

    logger.info(`Analysis completed and saved with ID: ${analysisId}`);

    // Return successful response
    res.json({
      status: 'success',
      id: analysisId,
      original_text: extractedText,
      cleaned_text: cleanedText,
      analysis: aiResults.analysis,
      suggestions: aiResults.suggestions,
      metadata: {
        filename: req.file.originalname,
        fileSize: req.file.size,
        pageCount,
        processingTime: Date.now() - startTime,
        ocrConfidence: ocrResults?.confidence,
        language
      }
    });

  } catch (error) {
    logger.error('Upload processing failed:', error);

    // If we have an analysis ID, update it with error status
    if (analysisId) {
      try {
        await Analysis.findByIdAndUpdate(analysisId, {
          $set: { 
            errorMessage: error.message,
            processingTime: Date.now() - startTime
          }
        });
      } catch (updateError) {
        logger.error('Failed to update analysis with error:', updateError);
      }
    }

    // Return appropriate error response
    if (error.message.includes('File size exceeds') || 
        error.message.includes('Unsupported file type') ||
        error.message.includes('Invalid MIME type')) {
      return res.status(400).json({
        status: 'error',
        error: error.message
      });
    }

    if (error.message.includes('OCR processing failed') ||
        error.message.includes('AI analysis failed')) {
      return res.status(422).json({
        status: 'error',
        error: 'Document processing failed. Please ensure the document contains clear, readable text.',
        details: error.message
      });
    }

    // Generic server error
    res.status(500).json({
      status: 'error',
      error: 'Internal server error occurred while processing your document.',
      requestId: analysisId
    });
  }
});

module.exports = router;