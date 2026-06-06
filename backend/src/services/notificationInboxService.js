/**
 * Notification Inbox Service
 * Persists user-facing notifications so they can be reviewed in-app, and
 * provides read/list/delete operations over that inbox.
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const ServiceError = require('../utils/ServiceError');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function mapRow(row) {
  return {
    id: row.notification_id,
    eventName: row.event_name,
    title: row.title,
    body: row.body,
    incidentId: row.incident_id,
    data: row.data || {},
    read: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/**
 * Persist a notification for a user. Best-effort: failures are logged, not
 * thrown, so the live socket delivery is never blocked by an inbox write.
 */
async function recordNotification(userId, { eventName, title, body, incidentId, data } = {}) {
  if (!userId || !eventName || !title) {
    return null;
  }

  try {
    const row = await db.one(
      `INSERT INTO notifications (user_id, event_name, title, body, incident_id, data)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING notification_id, user_id, event_name, title, body, incident_id, data, is_read, read_at, created_at`,
      [
        userId,
        eventName,
        title,
        body || null,
        incidentId || null,
        JSON.stringify(data || {}),
      ]
    );
    return mapRow(row);
  } catch (error) {
    logger.error(`Failed to persist notification for user ${userId}: ${error.message}`);
    return null;
  }
}

async function listForUser(userId, { limit = DEFAULT_LIMIT, unreadOnly = false } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const rows = await db.manyOrNone(
    `SELECT notification_id, user_id, event_name, title, body, incident_id, data, is_read, read_at, created_at
     FROM notifications
     WHERE user_id = $1
       AND ($2::boolean = FALSE OR is_read = FALSE)
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, Boolean(unreadOnly), safeLimit]
  );

  return rows.map(mapRow);
}

async function getUnreadCount(userId) {
  const result = await db.one(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return result.count;
}

async function markRead(userId, notificationId) {
  const row = await db.oneOrNone(
    `UPDATE notifications
     SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE notification_id = $1 AND user_id = $2
     RETURNING notification_id`,
    [notificationId, userId]
  );

  if (!row) {
    throw ServiceError.notFound('Notification');
  }
}

async function markAllRead(userId) {
  await db.none(
    `UPDATE notifications
     SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

async function remove(userId, notificationId) {
  const row = await db.oneOrNone(
    'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id',
    [notificationId, userId]
  );

  if (!row) {
    throw ServiceError.notFound('Notification');
  }
}

async function clearAll(userId) {
  await db.none('DELETE FROM notifications WHERE user_id = $1', [userId]);
}

module.exports = {
  recordNotification,
  listForUser,
  getUnreadCount,
  markRead,
  markAllRead,
  remove,
  clearAll,
};
