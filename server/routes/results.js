import express from 'express';
import Analysis from '../models/Analysis.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/results/:id
 * Fetch analysis results by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid analysis ID format',
        errors: ['Analysis ID must be a valid MongoDB ObjectId']
      });
    }

    logger.info(`Fetching analysis results for ID: ${id}`);

    // Find analysis by ID
    const analysis = await Analysis.findById(id);

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Analysis not found',
        errors: ['No analysis found with the provided ID']
      });
    }

    // Return analysis data
    res.json({
      status: 'success',
      data: {
        id: analysis._id,
        originalText: analysis.originalText,
        analysis: analysis.analysis,
        suggestions: analysis.suggestions,
        metadata: analysis.metadata,
        status: analysis.status,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      }
    });

    logger.info(`Analysis results retrieved successfully for ID: ${id}`);

  } catch (error) {
    logger.error('Error fetching analysis results:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analysis results',
      errors: [error.message || 'Unknown server error']
    });
  }
});

/**
 * GET /api/results
 * Get recent analyses (for admin/debugging purposes)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Validate limits
    if (limit > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Limit cannot exceed 100',
        errors: ['Maximum limit is 100 results per request']
      });
    }

    logger.info(`Fetching recent analyses: page ${page}, limit ${limit}`);

    // Get recent analyses (excluding full text for performance)
    const analyses = await Analysis.find({}, {
      originalText: 0 // Exclude original text for performance
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    // Get total count for pagination
    const total = await Analysis.countDocuments();

    res.json({
      status: 'success',
      data: analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

    logger.info(`Retrieved ${analyses.length} recent analyses`);

  } catch (error) {
    logger.error('Error fetching recent analyses:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analyses',
      errors: [error.message || 'Unknown server error']
    });
  }
});

export default router;