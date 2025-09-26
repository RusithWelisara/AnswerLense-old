import express from 'express';
import Feedback from '../models/Feedback.js';
import Analysis from '../models/Analysis.js';
import { feedbackLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/feedback
 * Submit user feedback for an analysis
 */
router.post('/', feedbackLimiter, async (req, res) => {
  try {
    const { analysisId, rating, feedback, categories } = req.body;

    // Validate required fields
    if (!analysisId || !rating || !feedback) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        errors: ['analysisId, rating, and feedback are required']
      });
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid rating',
        errors: ['Rating must be an integer between 1 and 5']
      });
    }

    // Validate feedback length
    if (feedback.length > 2000) {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback too long',
        errors: ['Feedback must be 2000 characters or less']
      });
    }

    // Validate MongoDB ObjectId format
    if (!analysisId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid analysis ID format',
        errors: ['Analysis ID must be a valid MongoDB ObjectId']
      });
    }

    logger.info(`Feedback submission for analysis: ${analysisId}`);

    // Check if analysis exists
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Analysis not found',
        errors: ['No analysis found with the provided ID']
      });
    }

    // Validate categories if provided
    const validCategories = ['accuracy', 'helpfulness', 'clarity', 'completeness', 'speed'];
    let validatedCategories = [];
    
    if (categories && Array.isArray(categories)) {
      validatedCategories = categories.filter(cat => validCategories.includes(cat));
    }

    // Create feedback record
    const feedbackData = {
      analysisId,
      rating,
      feedback: feedback.trim(),
      categories: validatedCategories,
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip || req.connection.remoteAddress || '0.0.0.0'
    };

    const newFeedback = new Feedback(feedbackData);
    await newFeedback.save();

    logger.info(`Feedback saved successfully: ${newFeedback._id}`);

    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: newFeedback._id,
        analysisId: analysisId,
        rating: rating,
        submittedAt: newFeedback.createdAt
      }
    });

  } catch (error) {
    logger.error('Error submitting feedback:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback',
      errors: [error.message || 'Unknown server error']
    });
  }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics (for admin/analytics)
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Fetching feedback statistics');

    // Get basic stats
    const totalFeedback = await Feedback.countDocuments();
    
    // Get rating distribution
    const ratingStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get average rating
    const avgRating = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    // Get category distribution
    const categoryStats = await Feedback.aggregate([
      {
        $unwind: '$categories'
      },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get recent feedback count (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedback = await Feedback.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      status: 'success',
      data: {
        total: totalFeedback,
        averageRating: avgRating[0]?.averageRating || 0,
        ratingDistribution: ratingStats,
        categoryDistribution: categoryStats,
        recentFeedback: recentFeedback,
        generatedAt: new Date().toISOString()
      }
    });

    logger.info('Feedback statistics retrieved successfully');

  } catch (error) {
    logger.error('Error fetching feedback statistics:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feedback statistics',
      errors: [error.message || 'Unknown server error']
    });
  }
});

/**
 * GET /api/feedback/:analysisId
 * Get feedback for a specific analysis
 */
router.get('/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    // Validate MongoDB ObjectId format
    if (!analysisId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid analysis ID format',
        errors: ['Analysis ID must be a valid MongoDB ObjectId']
      });
    }

    logger.info(`Fetching feedback for analysis: ${analysisId}`);

    // Get feedback for the analysis
    const feedback = await Feedback.find({ analysisId })
      .sort({ createdAt: -1 })
      .select('-ipAddress -userAgent'); // Exclude sensitive data

    res.json({
      status: 'success',
      data: feedback,
      count: feedback.length
    });

    logger.info(`Retrieved ${feedback.length} feedback entries for analysis: ${analysisId}`);

  } catch (error) {
    logger.error('Error fetching analysis feedback:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feedback',
      errors: [error.message || 'Unknown server error']
    });
  }
});

export default router;