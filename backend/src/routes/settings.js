/**
 * Settings Routes
 * Handles HTTP concerns only: request parsing and response formatting.
 * Business logic delegated to settingsService.
 */

const express = require('express');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const settingsService = require('../services/settingsService');
const notificationService = require('../services/notificationService');
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
 * @route   GET /api/settings
 * @desc    Get current user's dashboard settings
 * @access  Private (Staff roles)
 */
router.get('/', authenticateToken, requireRole(['moderator', 'admin', 'law_enforcement']), async (req, res) => {
  try {
    const settings = await settingsService.getSettingsForUser(req.user.userId);

    res.json({
      status: 'OK',
      data: settings,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch settings');
  }
});

/**
 * @route   PUT /api/settings
 * @desc    Save current user's dashboard settings
 * @access  Private (Staff roles)
 */
router.put('/', authenticateToken, requireRole(['moderator', 'admin', 'law_enforcement']), async (req, res) => {
  try {
    const settings = await settingsService.saveSettingsForUser(
      req.user.userId,
      req.user.role,
      req.body
    );

    res.json({
      status: 'OK',
      message: 'Settings saved successfully',
      data: settings,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to save settings');
  }
});

/**
 * @route   POST /api/settings/reset
 * @desc    Reset current user's dashboard settings to defaults
 * @access  Private (Staff roles)
 */
router.post('/reset', authenticateToken, requireRole(['moderator', 'admin', 'law_enforcement']), async (req, res) => {
  try {
    const settings = await settingsService.resetSettingsForUser(req.user.userId, req.user.role);

    res.json({
      status: 'OK',
      message: 'Settings reset to defaults',
      data: settings,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to reset settings');
  }
});

/**
 * @route   POST /api/settings/weekly-digest/send
 * @desc    Send weekly digest immediately to current user (if enabled)
 * @access  Private (Staff roles)
 */
router.post('/weekly-digest/send', authenticateToken, requireRole(['moderator', 'admin', 'law_enforcement']), async (req, res) => {
  try {
    const result = await notificationService.sendWeeklyDigestForUser(req.user.userId);

    res.json({
      status: 'OK',
      message: 'Weekly digest sent',
      data: {
        sent: result.sent,
        summary: result.summary,
      },
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to send weekly digest');
  }
});

module.exports = router;
