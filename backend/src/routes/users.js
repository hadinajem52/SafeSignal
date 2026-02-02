/**
 * User Routes
 * Handles HTTP concerns only: request parsing, validation, and response formatting.
 * Business logic is delegated to the userService.
 */

const express = require('express');
const { param, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const userService = require('../services/userService');
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
 * @route   GET /api/users
 * @desc    Get all users with optional filtering
 * @access  Private (Admin/Moderator)
 */
router.get('/', authenticateToken, requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { role, limit = 50, offset = 0 } = req.query;

    const users = await userService.getAllUsers({ role, limit, offset });

    res.json({
      status: 'OK',
      data: users,
      count: users.length,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch users');
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin/Moderator)
 */
router.get('/:id', authenticateToken, requireRole(['admin', 'moderator']), [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Invalid user ID',
    });
  }

  try {
    const user = await userService.getUserById(req.params.id);

    res.json({
      status: 'OK',
      data: user,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch user');
  }
});

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user (suspend/unsuspend)
 * @access  Private (Admin only)
 */
router.patch('/:id', authenticateToken, requireRole('admin'), [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Invalid user ID',
    });
  }

  try {
    const { is_suspended } = req.body;

    if (is_suspended === undefined) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'is_suspended field is required',
      });
    }

    const updatedUser = await userService.updateUserSuspension(
      req.params.id,
      is_suspended
    );

    res.json({
      status: 'OK',
      message: is_suspended ? 'User suspended successfully' : 'User unsuspended successfully',
      data: updatedUser,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to update user');
  }
});

module.exports = router;
