import express from 'express';
import multer from 'multer';
import Analysis from '../models/Analysis.js';
import ocrProcessor from '../utils/ocrProcessor.js';
import aiProcessor from '../utils/aiProcessor.js';
import fileProcessor from '../utils/fileProcessor.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20971520, // 20MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

/**
 * POST /api/upload
 * Upload and analyze document
 */
router.post('/', uploadLimiter, upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  let analysisId = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Please select a file to analyze.',
        errors: ['Missing file in request']
      });
    }

    logger.info(`Upload request received: ${req.file.originalname} (${req.file.size} bytes)`);

    // Process the uploaded file
    const fileResult = await fileProcessor.processFile(req.file);
    if (!fileResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'File processing failed',
        errors: fileResult.errors,
        fileInfo: fileResult.fileInfo
      });
    }

    // Create analysis record in database
    const analysis = new Analysis({
      originalText: '', // Will be updated after OCR
      analysis: '', // Will be updated after AI processing
      suggestions: [],
      metadata: {
        fileType: fileResult.fileInfo.type,
        fileSize: req.file.size,
        pageCount: fileResult.pageCount
      },
      status: 'processing'
    });

    await analysis.save();
    analysisId = analysis._id;

    logger.info(`Analysis record created: ${analysisId}`);

    // Perform OCR on the file
    logger.info('Starting OCR processing...');
    const ocrResult = await ocrProcessor.processMultipleImages(fileResult.imageBuffers);

    if (!ocrResult.success || !ocrResult.text.trim()) {
      await Analysis.findByIdAndUpdate(analysisId, {
        status: 'failed',
        analysis: 'OCR processing failed. The image quality may be too poor or the text may not be readable.',
        updatedAt: Date.now()
      });

      return res.status(422).json({
        status: 'error',
        message: 'Text extraction failed',
        errors: ['Could not extract readable text from the uploaded file'],
        analysisId: analysisId,
        ocrDetails: {
          confidence: ocrResult.confidence,
          successfulPages: ocrResult.successfulPages,
          totalPages: ocrResult.totalPages
        }
      });
    }

    // Update analysis with OCR results
    await Analysis.findByIdAndUpdate(analysisId, {
      originalText: ocrResult.text,
      'metadata.ocrConfidence': ocrResult.confidence,
      updatedAt: Date.now()
    });

    logger.info(`OCR completed with ${ocrResult.confidence}% confidence`);

    // Perform AI analysis
    logger.info('Starting AI analysis...');
    const aiResult = await aiProcessor.analyzeText(ocrResult.text);

    if (!aiResult.success) {
      await Analysis.findByIdAndUpdate(analysisId, {
        status: 'failed',
        analysis: aiResult.analysis || 'AI analysis failed due to technical error.',
        updatedAt: Date.now()
      });

      return res.status(500).json({
        status: 'error',
        message: 'AI analysis failed',
        errors: [aiResult.error || 'Unknown AI processing error'],
        analysisId: analysisId,
        original_text: ocrResult.text.substring(0, 500) + '...'
      });
    }

    // Update analysis with AI results
    const totalProcessingTime = Date.now() - startTime;
    await Analysis.findByIdAndUpdate(analysisId, {
      analysis: aiResult.analysis,
      suggestions: aiResult.suggestions,
      status: 'completed',
      'metadata.processingTime': totalProcessingTime,
      updatedAt: Date.now()
    });

    logger.info(`Analysis completed successfully in ${totalProcessingTime}ms`);

    // Return successful response
    res.json({
      status: 'success',
      message: 'Document analyzed successfully',
      analysisId: analysisId,
      original_text: ocrResult.text,
      analysis: aiResult.analysis,
      suggestions: aiResult.suggestions,
      metadata: {
        fileInfo: fileResult.fileInfo,
        ocrConfidence: ocrResult.confidence,
        processingTime: totalProcessingTime,
        pageCount: fileResult.pageCount,
        chunkCount: aiResult.chunkCount
      }
    });

  } catch (error) {
    logger.error('Upload processing error:', error);

    // Update analysis status if record was created
    if (analysisId) {
      try {
        await Analysis.findByIdAndUpdate(analysisId, {
          status: 'failed',
          analysis: 'Processing failed due to server error.',
          updatedAt: Date.now()
        });
      } catch (updateError) {
        logger.error('Failed to update analysis status:', updateError);
      }
    }

    // Handle specific error types
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 'error',
          message: 'File too large',
          errors: [`File size exceeds ${(parseInt(process.env.MAX_FILE_SIZE) || 20971520) / 1024 / 1024}MB limit`]
        });
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during file processing',
      errors: [error.message || 'Unknown server error'],
      analysisId: analysisId
    });
  }
});

export default router;