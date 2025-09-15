import express from 'express';
import Analysis from '../models/Analysis.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/results/:id
 * Fetch analysis results by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid analysis ID format'
      });
    }

    // Find analysis
    const analysis = await Analysis.findById(id);

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        error: 'Analysis not found'
      });
    }

    logger.info(`Retrieved analysis: ${id}`);

    // Return analysis data
    res.json({
      status: 'success',
      data: {
        id: analysis._id,
        originalFilename: analysis.originalFilename,
        fileType: analysis.fileType,
        fileSize: analysis.fileSize,
        extractedText: analysis.extractedText,
        cleanedText: analysis.cleanedText,
        pageCount: analysis.pageCount,
        analysis: analysis.analysis,
        suggestions: analysis.suggestions,
        metadata: {
          processingTime: analysis.processingTime,
          aiModel: analysis.aiModel,
          language: analysis.language,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt
        },
        userFeedback: analysis.userFeedback
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve analysis:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to retrieve analysis results'
    });
  }
});

/**
 * GET /api/results
 * Get recent analyses (for admin/monitoring purposes)
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const analyses = await Analysis.find()
      .select('_id originalFilename fileType createdAt processingTime')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Analysis.countDocuments();

    res.json({
      status: 'success',
      data: analyses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve analyses list:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to retrieve analyses'
    });
  }
});

export default router;