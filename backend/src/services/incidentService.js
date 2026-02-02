/**
 * Incident Service
 * Handles all business logic for incident management.
 * Routes should only handle HTTP concerns (parsing requests, sending responses).
 * This service handles business rules and database interactions.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

const {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,
} = require('../../../constants/incident');

/**
 * Create a new incident
 * @param {Object} incidentData - The incident data
 * @param {number} reporterId - The ID of the user creating the incident
 * @returns {Promise<Object>} The created incident
 */
async function createIncident(incidentData, reporterId) {
  // Check if user is suspended
  const user = await db.oneOrNone('SELECT is_suspended FROM users WHERE user_id = $1', [reporterId]);
  
  if (!user) {
    throw ServiceError.notFound('User not found');
  }
  
  if (user.is_suspended) {
    throw ServiceError.forbidden('Your account has been suspended. You cannot submit reports.');
  }

  const {
    title,
    description,
    category,
    latitude,
    longitude,
    locationName,
    incidentDate,
    severity,
    isAnonymous,
    isDraft,
    photoUrls,
  } = incidentData;

  const incident = await db.one(
    `INSERT INTO incidents (
      reporter_id, title, description, category, latitude, longitude,
      location, location_name, incident_date, severity, is_anonymous, is_draft, photo_urls, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326)::geography,
      $7, $8, $9, $10, $11, $12, $13
    )
    RETURNING *`,
    [
      reporterId,
      title,
      description,
      category,
      latitude,
      longitude,
      locationName || null,
      incidentDate || new Date(),
      severity,
      isAnonymous || false,
      isDraft || false,
      photoUrls || null,
      isDraft ? 'draft' : 'submitted',
    ]
  );

  return incident;
}

/**
 * Get all incidents with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} [filters.category] - Filter by category
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.severity] - Filter by severity
 * @param {number} [filters.limit=50] - Max results to return
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Promise<Array>} Array of incidents
 */
async function getAllIncidents(filters = {}) {
  const { category, status, severity, limit = 50, offset = 0 } = filters;

  let query = `
    SELECT i.*, u.username, u.email 
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
    WHERE i.is_draft = FALSE
  `;
  const params = [];
  let paramCount = 1;

  if (category) {
    query += ` AND i.category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }

  if (status) {
    query += ` AND i.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  if (severity) {
    query += ` AND i.severity = $${paramCount}`;
    params.push(severity);
    paramCount++;
  }

  query += ` ORDER BY i.incident_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const incidents = await db.manyOrNone(query, params);
  return incidents;
}

/**
 * Get incidents for a specific user
 * @param {number} userId - The user's ID
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Filter by status
 * @param {boolean|string} [filters.isDraft] - Filter by draft status
 * @param {number} [filters.limit=50] - Max results to return
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Promise<Object>} Object containing incidents array and pagination info
 */
async function getUserIncidents(userId, filters = {}) {
  const { status, isDraft, limit = 50, offset = 0 } = filters;

  let query = `
    SELECT 
      i.incident_id, i.title, i.description, i.category, i.severity,
      i.latitude, i.longitude, i.location_name, i.status, i.is_draft,
      i.created_at, i.incident_date, i.photo_urls, i.is_anonymous,
      u.username, u.email,
      COUNT(*) OVER() as total_count
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
    WHERE i.reporter_id = $1
  `;
  const params = [userId];
  let paramCount = 2;

  if (isDraft === 'true' || isDraft === true) {
    query += ` AND i.is_draft = TRUE`;
  } else if (isDraft === 'false' || isDraft === false) {
    query += ` AND i.is_draft = FALSE`;
  }

  if (status) {
    query += ` AND i.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  query += ` ORDER BY i.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(parseInt(limit), parseInt(offset));

  const incidents = await db.manyOrNone(query, params);
  const total = incidents.length > 0 ? parseInt(incidents[0].total_count || 0) : 0;
  const normalizedIncidents = incidents.map(({ total_count, ...incident }) => incident);

  return {
    incidents: normalizedIncidents || [],
    pagination: {
      offset: parseInt(offset),
      limit: parseInt(limit),
      total,
    },
  };
}

/**
 * Get a single incident by ID
 * @param {number} incidentId - The incident ID
 * @returns {Promise<Object|null>} The incident or null if not found
 */
async function getIncidentById(incidentId) {
  const incident = await db.oneOrNone(
    `SELECT i.*, u.username, u.email FROM incidents i
     JOIN users u ON i.reporter_id = u.user_id
     WHERE i.incident_id = $1`,
    [incidentId]
  );

  return incident;
}

/**
 * Get incidents by user ID (public view)
 * @param {number} userId - The user ID to get incidents for
 * @returns {Promise<Array>} Array of incidents
 */
async function getIncidentsByUserId(userId) {
  const incidents = await db.manyOrNone(
    `SELECT * FROM incidents WHERE reporter_id = $1 ORDER BY incident_date DESC`,
    [userId]
  );

  return incidents;
}

/**
 * Update an incident (full update)
 * @param {number} incidentId - The incident ID
 * @param {Object} updateData - The data to update
 * @param {Object} requestingUser - The user making the request
 * @param {number} requestingUser.userId - User's ID
 * @param {string} requestingUser.role - User's role
 * @returns {Promise<Object>} The updated incident
 * @throws {ServiceError} If incident not found or unauthorized
 */
async function updateIncident(incidentId, updateData, requestingUser) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  // Check ownership or admin role
  if (incident.reporter_id !== requestingUser.userId && requestingUser.role !== 'admin') {
    throw ServiceError.forbidden('Unauthorized to update this incident');
  }

  const {
    title,
    description,
    category,
    severity,
    status,
    isDraft,
    locationName,
    latitude,
    longitude,
  } = updateData;

  // Determine new status based on isDraft flag
  let newStatus = status;
  if (isDraft === false && incident.is_draft === true) {
    // Converting draft to submitted
    newStatus = 'submitted';
  } else if (isDraft === true) {
    // Saving as draft
    newStatus = 'draft';
  }

  const updatedIncident = await db.one(
    `UPDATE incidents 
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         category = COALESCE($4, category),
         severity = COALESCE($5, severity),
         status = COALESCE($6, status),
         is_draft = COALESCE($7, is_draft),
         location_name = COALESCE($8, location_name),
         latitude = COALESCE($9, latitude),
         longitude = COALESCE($10, longitude),
         location = CASE
           WHEN $9 IS NOT NULL AND $10 IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint($10::float, $9::float), 4326)::geography
           ELSE location
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [
      incidentId,
      title,
      description,
      category,
      severity,
      newStatus,
      isDraft !== undefined ? isDraft : null,
      locationName,
      latitude,
      longitude,
    ]
  );

  return updatedIncident;
}

/**
 * Partially update an incident (PATCH)
 * @param {number} incidentId - The incident ID
 * @param {Object} updateData - The data to update
 * @param {Object} requestingUser - The user making the request
 * @param {number} requestingUser.userId - User's ID
 * @param {string} requestingUser.role - User's role
 * @returns {Promise<Object>} The updated incident
 * @throws {ServiceError} If incident not found or unauthorized
 */
async function patchIncident(incidentId, updateData, requestingUser) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  // Check ownership or admin role
  if (incident.reporter_id !== requestingUser.userId && requestingUser.role !== 'admin') {
    throw ServiceError.forbidden('Unauthorized to update this incident');
  }

  const { title, description, category, severity, status } = updateData;

  const updatedIncident = await db.one(
    `UPDATE incidents 
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         category = COALESCE($4, category),
         severity = COALESCE($5, severity),
         status = COALESCE($6, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [incidentId, title, description, category, severity, status]
  );

  return updatedIncident;
}

/**
 * Delete an incident
 * @param {number} incidentId - The incident ID
 * @param {Object} requestingUser - The user making the request
 * @param {number} requestingUser.userId - User's ID
 * @param {string} requestingUser.role - User's role
 * @returns {Promise<void>}
 * @throws {ServiceError} If incident not found or unauthorized
 */
async function deleteIncident(incidentId, requestingUser) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  // Check ownership or admin role
  if (incident.reporter_id !== requestingUser.userId && requestingUser.role !== 'admin') {
    throw ServiceError.forbidden('Unauthorized to delete this incident');
  }

  await db.none('DELETE FROM incidents WHERE incident_id = $1', [incidentId]);
}

/**
 * Log a moderation action
 * @param {number} incidentId
 * @param {number} moderatorId
 * @param {string} actionType
 * @param {string} [notes]
 */
async function logAction(incidentId, moderatorId, actionType, notes = null) {
  // Map 'escalated' to 'flagged' to satisfy DB constraint if needed, 
  // or use safe types. The DB constraint has 'flagged'.
  const safeActionType = actionType === 'escalated' ? 'flagged' : actionType;
  
  await db.none(
    `INSERT INTO report_actions (incident_id, moderator_id, action_type, notes)
     VALUES ($1, $2, $3, $4)`,
    [incidentId, moderatorId, safeActionType, notes]
  );
}

/**
 * Verify an incident
 * @param {number} incidentId
 * @param {Object} requestingUser
 */
async function verifyIncident(incidentId, requestingUser) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  const updated = await db.one(
    `UPDATE incidents 
     SET status = 'verified', updated_at = CURRENT_TIMESTAMP 
     WHERE incident_id = $1 
     RETURNING *`,
    [incidentId]
  );

  await logAction(incidentId, requestingUser.userId, 'verified');

  return updated;
}

/**
 * Reject an incident
 * @param {number} incidentId
 * @param {Object} requestingUser
 */
async function rejectIncident(incidentId, requestingUser) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  const updated = await db.one(
    `UPDATE incidents 
     SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
     WHERE incident_id = $1 
     RETURNING *`,
    [incidentId]
  );

  await logAction(incidentId, requestingUser.userId, 'rejected');

  return updated;
}

/**
 * Escalate an incident
 * @param {number} incidentId
 * @param {Object} requestingUser
 * @param {string} reason
 */
async function escalateIncident(incidentId, requestingUser, reason) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  // Escalation implies moving to 'auto_flagged' or keeping 'in_review' but adding high priority/audit log
  // Since 'escalated' isn't a valid status in our check constraint, we'll use 'auto_flagged' 
  // or just rely on the audit trail and severity update.
  const updated = await db.one(
    `UPDATE incidents 
     SET severity = 'critical', updated_at = CURRENT_TIMESTAMP 
     WHERE incident_id = $1 
     RETURNING *`,
    [incidentId]
  );

  await logAction(incidentId, requestingUser.userId, 'flagged', `Escalated: ${reason}`);

  return updated;
}

module.exports = {
  // Constants
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,

  // Service methods
  createIncident,
  getAllIncidents,
  getUserIncidents,
  getIncidentById,
  getIncidentsByUserId,
  updateIncident,
  patchIncident,
  deleteIncident,
  verifyIncident,
  rejectIncident,
  escalateIncident,
};
