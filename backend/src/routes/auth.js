/**
 * Authentication Routes
 * Handles HTTP concerns only: request parsing, validation, and response formatting.
 * Business logic is delegated to the authService.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const db = require('../config/database');
const authService = require('../services/authService');
const ServiceError = require('../utils/ServiceError');

const router = express.Router();

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'ERROR',
      message: 'Validation failed',
      errors: errors.array(),
    });
    return true;
  }
  return false;
}

/**
 * Handle service errors
 */
function handleServiceError(error, res, defaultMessage) {
  if (db.isConnectionError(error)) {
    console.error(`${defaultMessage}: database unavailable (${db.formatDatabaseError(error)})`);
    return res.status(503).json({
      status: 'ERROR',
      message: 'Database is unavailable. Please try again later.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  console.error(`${defaultMessage}: ${error?.message || error}`);

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
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.json({
        status: 'OK',
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Login failed');
    }
  }
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['citizen', 'moderator', 'law_enforcement']),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { username, email, password, role } = req.body;
      const user = await authService.register(username, email, password, role);

      res.status(201).json({
        status: 'OK',
        message: 'Registration successful',
        data: user,
      });
    } catch (error) {
      handleServiceError(error, res, 'Registration failed');
    }
  }
);

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth authentication
 * @access  Public
 */
router.post('/google', async (req, res) => {
  try {
    const { idToken, email, name } = req.body;
    const result = await authService.googleLogin(idToken, email, name);

    res.json({
      status: 'OK',
      message: 'Google sign-in successful',
      data: result,
    });
  } catch (error) {
    handleServiceError(error, res, 'Google sign-in failed');
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile (requires valid token)
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.json({
      status: 'OK',
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch profile');
  }
});

/**
 * @route   PATCH /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.patch(
  '/me',
  authenticateToken,
  [
    body('username').trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const user = await authService.updateCurrentUserProfile(req.user.userId, {
        username: req.body.username,
        email: req.body.email,
      });

      res.json({
        status: 'OK',
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to update profile');
    }
  }
);

/**
 * @route   PATCH /api/auth/me/password
 * @desc    Change current user's password
 * @access  Private
 */
router.patch(
  '/me/password',
  authenticateToken,
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword').isString().isLength({ min: 8 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      await authService.changeCurrentUserPassword(
        req.user.userId,
        req.body.currentPassword,
        req.body.newPassword
      );

      res.json({
        status: 'OK',
        message: 'Password updated successfully',
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to update password');
    }
  }
);

module.exports = router;
