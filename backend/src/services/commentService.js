/**
 * Comment Service
 * Business logic for incident comments and timeline
 * Follows architecture: Service handles business logic, database queries, and authorization
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const { emitComment } = require('../utils/socketService');

/**
 * Get timeline for an incident (including status changes and comments)
 * @param {number} incidentId - The incident ID
 * @param {number} userId - The requesting user ID
 * @returns {Promise<Object>} Timeline data with incident info and events
 */
async function getTimeline(incidentId, userId) {
  // Fetch incident and user info in parallel
  const [incident, user] = await Promise.all([
    db.oneOrNone(
      `SELECT 
        i.incident_id, 
        i.reporter_id, 
        i.status,
        i.is_draft
      FROM incidents i 
      WHERE i.incident_id = $1`,
      [incidentId]
    ),
    db.oneOrNone(
      `SELECT user_id, role FROM users WHERE user_id = $1`,
      [userId]
    ),
  ]);

  if (!incident) {
    throw ServiceError.notFound('Incident not found');
  }

  if (!user) {
    throw ServiceError.unauthorized('User not found');
  }

  // Authorization: citizens can only view their own incidents, staff can view all
  const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(user.role);
  const isOwner = incident.reporter_id === userId;

  if (!isStaff && !isOwner) {
    throw ServiceError.forbidden('You do not have permission to view this incident timeline');
  }

  // Fetch comments and status changes in parallel
  const [comments, statusChanges] = await Promise.all([
    getCommentsForIncident(incidentId, isStaff),
    getStatusChangesForIncident(incidentId),
  ]);

  // Combine and sort timeline events
  const timeline = [
    ...comments.map((c) => ({
      item_type: 'comment',
      user_id: c.user_id,
      username: c.user_name,
      role: c.user_role,
      content: c.content,
      is_internal: c.is_internal,
      attachments: c.attachments,
      created_at: c.created_at,
    })),
    ...statusChanges.map((s) => ({
      item_type: 'system',
      action_type: s.action_type,
      user_id: s.moderator_id,
      username: s.moderator_name,
      role: s.moderator_role,
      notes: s.notes,
      created_at: s.timestamp,
    })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return timeline;
}

/**
 * Get comments for an incident
 * @param {number} incidentId - The incident ID
 * @param {boolean} includeInternal - Whether to include internal comments
 * @returns {Promise<Array>} Array of comments
 */
async function getCommentsForIncident(incidentId, includeInternal = false) {
  const query = `
    SELECT 
      c.comment_id,
      c.incident_id,
      c.user_id,
      c.content,
      c.is_internal,
      c.attachments,
      c.created_at,
      u.username AS user_name,
      u.role AS user_role
    FROM incident_comments c
    JOIN users u ON c.user_id = u.user_id
    WHERE c.incident_id = $1
      ${includeInternal ? '' : 'AND c.is_internal = FALSE'}
    ORDER BY c.created_at ASC
  `;

  return db.manyOrNone(query, [incidentId]);
}

/**
 * Get status changes for an incident from report_actions
 * @param {number} incidentId - The incident ID
 * @returns {Promise<Array>} Array of status changes
 */
async function getStatusChangesForIncident(incidentId) {
  const query = `
    SELECT 
      ra.action_id,
      ra.incident_id,
      ra.moderator_id,
      ra.action_type,
      ra.notes,
      ra.timestamp,
      u.username AS moderator_name,
      u.role AS moderator_role
    FROM report_actions ra
    LEFT JOIN users u ON ra.moderator_id = u.user_id
    WHERE ra.incident_id = $1
    ORDER BY ra.timestamp ASC
  `;

  return db.manyOrNone(query, [incidentId]);
}

/**
 * Create a new comment on an incident
 * @param {number} incidentId - The incident ID
 * @param {number} userId - The user posting the comment
 * @param {Object} commentData - Comment data
 * @param {string} commentData.content - Comment content
 * @param {boolean} [commentData.isInternal=false] - Whether comment is internal
 * @param {Array<string>} [commentData.attachments=[]] - Array of attachment URLs
 * @returns {Promise<Object>} The created comment
 */
async function createComment(incidentId, userId, commentData) {
  const { content, isInternal = false, attachments = [] } = commentData;

  // Validate content
  if (!content || content.trim().length === 0) {
    throw ServiceError.badRequest('Comment content is required');
  }

  if (content.length > 10000) {
    throw ServiceError.badRequest('Comment content exceeds maximum length of 10,000 characters');
  }

  // Fetch incident and user info in parallel
  const [incident, user] = await Promise.all([
    db.oneOrNone(
      `SELECT 
        i.incident_id, 
        i.reporter_id, 
        i.status,
        i.is_draft
      FROM incidents i 
      WHERE i.incident_id = $1`,
      [incidentId]
    ),
    db.oneOrNone(
      `SELECT user_id, role, username FROM users WHERE user_id = $1`,
      [userId]
    ),
  ]);

  if (!incident) {
    throw ServiceError.notFound('Incident not found');
  }

  if (!user) {
    throw ServiceError.unauthorized('User not found');
  }

  // Authorization: citizens can only comment on their own incidents, staff can comment on all
  const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(user.role);
  const isOwner = incident.reporter_id === userId;

  if (!isStaff && !isOwner) {
    throw ServiceError.forbidden('You do not have permission to comment on this incident');
  }

  // Only staff can create internal comments
  if (isInternal && !isStaff) {
    throw ServiceError.forbidden('Only staff members can create internal comments');
  }

  // Cannot comment on draft incidents
  if (incident.is_draft) {
    throw ServiceError.badRequest('Cannot comment on draft incidents');
  }

  // Insert comment
  const comment = await db.one(
    `INSERT INTO incident_comments 
      (incident_id, user_id, content, is_internal, attachments)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING 
      comment_id, 
      incident_id, 
      user_id, 
      content, 
      is_internal, 
      attachments, 
      created_at`,
    [incidentId, userId, content.trim(), isInternal, attachments]
  );

  // Return comment with user info in the format expected by frontend
  const commentResponse = {
    comment_id: comment.comment_id,
    incident_id: comment.incident_id,
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    content: comment.content,
    is_internal: comment.is_internal,
    attachments: comment.attachments,
    created_at: comment.created_at,
    item_type: 'comment',
  };

  // Emit socket event to notify connected clients
  emitComment(incidentId, commentResponse);

  return commentResponse;
}

module.exports = {
  getTimeline,
  createComment,
};
