/**
 * Notifications Routes
 * Read/manage the authenticated user's notification inbox.
 * HTTP concerns only; business logic lives in notificationInboxService.
 */

const express = require('express');
const authenticateToken = require('../middleware/auth');
const notificationInboxService = require('../services/notificationInboxService');
const ServiceError = require('../utils/ServiceError');

const router = express.Router();

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

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw ServiceError.badRequest('Invalid notification id');
  }
  return id;
}

/**
 * @route   GET /api/notifications
 * @desc    List the current user's notifications + unread count
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, unreadOnly } = req.query;
    const [notifications, unreadCount] = await Promise.all([
      notificationInboxService.listForUser(req.user.userId, {
        limit,
        unreadOnly: unreadOnly === 'true',
      }),
      notificationInboxService.getUnreadCount(req.user.userId),
    ]);

    res.json({
      status: 'OK',
      data: { notifications, unreadCount },
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch notifications');
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Unread notification count (for the home badge)
 * @access  Private
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await notificationInboxService.getUnreadCount(req.user.userId);
    res.json({ status: 'OK', data: { unreadCount } });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch unread count');
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    await notificationInboxService.markRead(req.user.userId, parseId(req.params.id));
    res.json({ status: 'OK', message: 'Notification marked as read' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to mark notification as read');
  }
});

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all of the user's notifications as read
 * @access  Private
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await notificationInboxService.markAllRead(req.user.userId);
    res.json({ status: 'OK', message: 'All notifications marked as read' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to mark all notifications as read');
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a single notification
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await notificationInboxService.remove(req.user.userId, parseId(req.params.id));
    res.json({ status: 'OK', message: 'Notification deleted' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to delete notification');
  }
});

/**
 * @route   DELETE /api/notifications
 * @desc    Clear all of the user's notifications
 * @access  Private
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await notificationInboxService.clearAll(req.user.userId);
    res.json({ status: 'OK', message: 'Notifications cleared' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to clear notifications');
  }
});

module.exports = router;
