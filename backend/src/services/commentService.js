/**
 * Comment Service
 * Handles all business logic for incident comments and timeline.
 * Implements visibility rules for internal vs public comments.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const { emitComment } = require('../utils/socketService');

const STAFF_ROLES = ['moderator', 'admin', 'law_enforcement'];

/**
 * Check if user is staff (moderator, admin, or law_enforcement)
 * @param {number} userId - The user ID to check
 * @returns {Promise<boolean>} True if user is staff
 */
async function isStaff(userId) {
  const user = await db.oneOrNone(
    'SELECT role FROM users WHERE user_id = $1',
    [userId]
  );
  
  if (!user) {
    throw ServiceError.notFound('User not found');
  }
  
  return STAFF_ROLES.includes(user.role);
}

/**
 * Check if user can access an incident
 * Citizens can only access their own incidents, Staff can access all
 * @param {number} userId - The user ID
 * @param {number} incidentId - The incident ID
 * @returns {Promise<{canAccess: boolean, isStaff: boolean}>}
 */
async function checkIncidentAccess(userId, incidentId) {
  const user = await db.oneOrNone(
    'SELECT role FROM users WHERE user_id = $1',
    [userId]
  );
  
  if (!user) {
    throw ServiceError.notFound('User not found');
  }
  
  const userIsStaff = STAFF_ROLES.includes(user.role);
  
  // Staff can access all incidents
  if (userIsStaff) {
    return { canAccess: true, isStaff: true };
  }
  
  // Citizens can only access their own incidents
  const incident = await db.oneOrNone(
    'SELECT reporter_id FROM incidents WHERE incident_id = $1',
    [incidentId]
  );
  
  if (!incident) {
    throw ServiceError.notFound('Incident not found');
  }
  
  const canAccess = incident.reporter_id === userId;
  return { canAccess, isStaff: false };
}

/**
 * Get timeline for an incident (comments + status changes merged)
 * @param {number} incidentId - The incident ID
 * @param {number} userId - The requesting user ID
 * @returns {Promise<Array>} Timeline items sorted by created_at
 */
async function getTimeline(incidentId, userId) {
  // Check access
  const { canAccess, isStaff: userIsStaff } = await checkIncidentAccess(userId, incidentId);
  
  if (!canAccess) {
    throw ServiceError.forbidden('You do not have access to this incident');
  }
  
  // Fetch comments
  const commentsQuery = userIsStaff
    ? `
      SELECT 
        c.comment_id,
        c.incident_id,
        c.user_id,
        c.content,
        c.is_internal,
        c.attachments,
        c.created_at,
        u.username,
        u.role,
        'comment' as item_type
      FROM incident_comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.incident_id = $1
    `
    : `
      SELECT 
        c.comment_id,
        c.incident_id,
        c.user_id,
        c.content,
        c.is_internal,
        c.attachments,
        c.created_at,
        u.username,
        u.role,
        'comment' as item_type
      FROM incident_comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.incident_id = $1 AND c.is_internal = false
    `;
  
  // Fetch status changes from report_actions
  const actionsQuery = `
    SELECT 
      ra.action_id,
      ra.incident_id,
      ra.moderator_id as user_id,
      ra.action_type,
      ra.notes,
      ra.timestamp as created_at,
      u.username,
      u.role,
      'system' as item_type
    FROM report_actions ra
    LEFT JOIN users u ON ra.moderator_id = u.user_id
    WHERE ra.incident_id = $1 AND ra.action_type IN ('status_changed', 'verified', 'rejected', 'needs_info')
  `;
  
  const [comments, actions] = await Promise.all([
    db.manyOrNone(commentsQuery, [incidentId]),
    db.manyOrNone(actionsQuery, [incidentId])
  ]);
  
  // Merge and sort by created_at
  const timeline = [...comments, ...actions].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );
  
  return timeline;
}

/**
 * Create a new comment on an incident
 * @param {number} incidentId - The incident ID
 * @param {number} userId - The comment author ID
 * @param {Object} commentData - The comment data
 * @returns {Promise<Object>} The created comment with user info
 */
async function createComment(incidentId, userId, commentData) {
  const { content, isInternal, attachments } = commentData;
  
  // Check access
  const { canAccess, isStaff: userIsStaff } = await checkIncidentAccess(userId, incidentId);
  
  if (!canAccess) {
    throw ServiceError.forbidden('You do not have access to this incident');
  }
  
  // Validate content
  if (!content || content.trim().length === 0) {
    throw ServiceError.badRequest('Comment content cannot be empty');
  }
  
  if (content.length > 10000) {
    throw ServiceError.badRequest('Comment content exceeds maximum length of 10000 characters');
  }
  
  // Only staff can post internal comments
  const commentIsInternal = isInternal === true;
  if (commentIsInternal && !userIsStaff) {
    throw ServiceError.forbidden('Only staff can post internal comments');
  }
  
  // Create comment
  const comment = await db.one(
    `INSERT INTO incident_comments (
      incident_id, user_id, content, is_internal, attachments
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [incidentId, userId, content.trim(), commentIsInternal, attachments || null]
  );
  
  // Fetch user info for the response
  const commentWithUser = await db.one(
    `SELECT 
      c.*,
      u.username,
      u.role
    FROM incident_comments c
    JOIN users u ON c.user_id = u.user_id
    WHERE c.comment_id = $1`,
    [comment.comment_id]
  );
  
  // Emit real-time event
  emitComment(incidentId, commentWithUser);
  
  return commentWithUser;
}

/**
 * Get comments count for an incident
 * @param {number} incidentId - The incident ID
 * @param {boolean} includeInternal - Whether to include internal comments
 * @returns {Promise<number>} The comment count
 */
async function getCommentCount(incidentId, includeInternal = false) {
  const query = includeInternal
    ? 'SELECT COUNT(*) FROM incident_comments WHERE incident_id = $1'
    : 'SELECT COUNT(*) FROM incident_comments WHERE incident_id = $1 AND is_internal = false';
  
  const result = await db.one(query, [incidentId]);
  return parseInt(result.count, 10);
}

module.exports = {
  isStaff,
  checkIncidentAccess,
  getTimeline,
  createComment,
  getCommentCount,
};
