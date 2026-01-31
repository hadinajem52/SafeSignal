/**
 * Incident Service
 * Handles all business logic for incident management.
 * Routes should only handle HTTP concerns (parsing requests, sending responses).
 * This service handles business rules and database interactions.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

/**
 * Valid incident categories
 */
const VALID_CATEGORIES = [
  'theft',
  'assault',
  'vandalism',
  'suspicious_activity',
  'traffic_incident',
  'noise_complaint',
  'fire',
  'medical_emergency',
  'hazard',
  'other',
];

/**
 * Valid severity levels
 */
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Valid incident statuses
 */
const VALID_STATUSES = [
  'draft',
  'submitted',
  'auto_processed',
  'auto_flagged',
  'in_review',
  'verified',
  'rejected',
  'needs_info',
  'published',
  'resolved',
  'archived',
  'merged',
];

/**
 * Create a new incident
 * @param {Object} incidentData - The incident data
 * @param {number} reporterId - The ID of the user creating the incident
 * @returns {Promise<Object>} The created incident
 */
async function createIncident(incidentData, reporterId) {
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
      location_name, incident_date, severity, is_anonymous, is_draft, photo_urls, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      u.username, u.email
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

  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(*) as total FROM incidents WHERE reporter_id = $1
  `;
  let countParams = [userId];
  let countParamCount = 2;

  if (isDraft === 'true' || isDraft === true) {
    countQuery += ` AND is_draft = TRUE`;
  } else if (isDraft === 'false' || isDraft === false) {
    countQuery += ` AND is_draft = FALSE`;
  }

  if (status) {
    countQuery += ` AND status = $${countParamCount}`;
    countParams.push(status);
  }

  const countResult = await db.one(countQuery, countParams);

  return {
    incidents: incidents || [],
    pagination: {
      offset: parseInt(offset),
      limit: parseInt(limit),
      total: parseInt(countResult.total),
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
};
