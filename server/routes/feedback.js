const express = require('express');
const router = express.Router();
const Analysis = require('../models/Analysis');
const logger = require('../utils/logger');
const { feedbackLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/feedback
 * Save user feedback on AI analysis
 */
router.post('/', feedbackLimiter, async (req, res) => {
  try {
    const { analysisId, rating, comment } = req.body;

    // Validate required fields
    if (!analysisId) {
      return res.status(400).json({
        status: 'error',
        error: 'Analysis ID is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        error: 'Rating must be between 1 and 5'
      });
    }

    // Validate ID format
    if (!analysisId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid analysis ID format'
      });
    }

    // Find the analysis
    const analysis = await Analysis.findById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        error: 'Analysis not found'
      });
    }

    // Add feedback
    const feedback = {
      rating: parseInt(rating),
      comment: comment ? comment.trim().substring(0, 1000) : '', // Limit comment length
      createdAt: new Date()
    };

    analysis.userFeedback.push(feedback);
    await analysis.save();

    logger.info(`Feedback added to analysis ${analysisId}: rating ${rating}`);

    res.json({
      status: 'success',
      message: 'Feedback saved successfully',
      data: {
        feedbackId: analysis.userFeedback[analysis.userFeedback.length - 1]._id,
        analysisId,
        rating: feedback.rating,
        comment: feedback.comment
      }
    });

  } catch (error) {
    logger.error('Failed to save feedback:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to save feedback'
    });
  }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics (for monitoring)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Analysis.aggregate([
      { $unwind: '$userFeedback' },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$userFeedback.rating' },
          ratingDistribution: {
            $push: '$userFeedback.rating'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalFeedback: 1,
          averageRating: { $round: ['$averageRating', 2] },
          ratingDistribution: {
            $reduce: {
              input: [1, 2, 3, 4, 5],
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [[
                      { k: { $toString: '$$this' }, v: {
                        $size: {
                          $filter: {
                            input: '$ratingDistribution',
                            cond: { $eq: ['$$item', '$$this'] }
                          }
                        }
                      }}
                    ]]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalFeedback: 0,
      averageRating: 0,
      ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    };

    res.json({
      status: 'success',
      data: result
    });

  } catch (error) {
    logger.error('Failed to get feedback stats:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to retrieve feedback statistics'
    });
  }
});

module.exports = router;