/**
 * Stats Routes
 * Handles HTTP concerns only: request parsing and response formatting.
 * Business logic and complex queries delegated to statsService.
 */

const express = require('express');
const authenticateToken = require('../middleware/auth');
const statsService = require('../services/statsService');
const ServiceError = require('../utils/ServiceError');

const router = express.Router();

/**
 * Handle service errors
 */
function handleServiceError(error, res, defaultMessage) {
  console.error(`${defaultMessage}:`, error);

  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      status: 'ERROR',
      message: error.message,
      code: error.code,
    });
  }

  res.status(500).json({
    status: 'ERROR',
    message: defaultMessage,
  });
}

/**
 * @route   GET /api/stats/moderator/dashboard
 * @desc    Get dashboard statistics for moderators
 * @access  Private
 */
router.get('/moderator/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = await statsService.getModeratorStats();

    res.json({
      status: 'OK',
      data: stats,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch moderator dashboard statistics');
  }
});

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics for mobile app users
 * @access  Private
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Note: Middleware might use userId or user_id, ensuring access to correct prop
    // Fallback if middleware attached 'userId' (common in other routes)
    const effectiveUserId = userId || req.user.userId;

    const { latitude, longitude, radius } = req.query;

    const dashboardData = await statsService.getUserDashboardStats(effectiveUserId, {
      latitude,
      longitude,
      radius,
    });

    res.json({
      status: 'SUCCESS',
      data: dashboardData,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch dashboard statistics');
  }
});

/**
 * @route   GET /api/stats/area-safety
 * @desc    Get safety statistics for a specific area
 * @access  Public
 */
router.get('/area-safety', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Latitude and longitude are required',
      });
    }

    const safetyStats = await statsService.getAreaSafetyStats(latitude, longitude, radius);

    res.json({
      status: 'OK',
      data: safetyStats,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to calculate area safety');
  }
});

module.exports = router;

