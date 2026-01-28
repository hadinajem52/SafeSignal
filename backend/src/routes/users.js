const express = require('express');
const { param } = require('express-validator');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users with optional filtering
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        user_id, username, email, role, is_suspended, created_at,
        (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND is_draft = FALSE) as total_reports,
        (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND status = 'verified' AND is_draft = FALSE) as verified_reports,
        (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND status = 'rejected' AND is_draft = FALSE) as rejected_reports
      FROM users u
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const users = await db.manyOrNone(query, params);

    res.json({
      status: 'OK',
      data: users.map(u => ({
        id: u.user_id,
        name: u.username,
        email: u.email,
        role: u.role,
        status: u.is_suspended ? 'suspended' : 'active',
        isSuspended: u.is_suspended,
        totalReports: parseInt(u.total_reports || 0),
        verifiedReports: parseInt(u.verified_reports || 0),
        rejectedReports: parseInt(u.rejected_reports || 0),
        joinedDate: u.created_at,
      })) || [],
      count: users.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch users',
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, [param('id').isInt()], async (req, res) => {
  try {
    const user = await db.oneOrNone(
      `SELECT 
        user_id, username, email, role, is_suspended, created_at,
        (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND is_draft = FALSE) as total_reports,
        (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND status = 'verified' AND is_draft = FALSE) as verified_reports,
        (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND status = 'rejected' AND is_draft = FALSE) as rejected_reports
      FROM users u
      WHERE user_id = $1`,
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'User not found',
      });
    }

    res.json({
      status: 'OK',
      data: {
        id: user.user_id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.is_suspended ? 'suspended' : 'active',
        isSuspended: user.is_suspended,
        totalReports: parseInt(user.total_reports || 0),
        verifiedReports: parseInt(user.verified_reports || 0),
        rejectedReports: parseInt(user.rejected_reports || 0),
        joinedDate: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch user',
    });
  }
});

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user (suspend/unsuspend)
 * @access  Private
 */
router.patch('/:id', authenticateToken, [param('id').isInt()], async (req, res) => {
  try {
    const { is_suspended } = req.body;

    if (is_suspended === undefined) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'is_suspended field is required',
      });
    }

    const user = await db.oneOrNone(
      'SELECT * FROM users WHERE user_id = $1',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'User not found',
      });
    }

    const updatedUser = await db.one(
      'UPDATE users SET is_suspended = $1 WHERE user_id = $2 RETURNING *',
      [is_suspended, req.params.id]
    );

    res.json({
      status: 'OK',
      message: is_suspended ? 'User suspended successfully' : 'User unsuspended successfully',
      data: {
        id: updatedUser.user_id,
        name: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isSuspended: updatedUser.is_suspended,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to update user',
    });
  }
});

module.exports = router;
