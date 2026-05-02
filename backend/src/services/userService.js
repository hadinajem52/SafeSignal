/**
 * User Service
 * Handles user management business logic and reporting statistics.
 * Centralizes the "what counts as verified/rejected" logic.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const { LIMITS } = require('../../../constants/limits');

const roundCoordinate = (value) => Number(Number(value).toFixed(2));

const validateCoordinates = (latitude, longitude) => {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude) ||
    parsedLatitude < LIMITS.COORDINATES.LAT.MIN ||
    parsedLatitude > LIMITS.COORDINATES.LAT.MAX ||
    parsedLongitude < LIMITS.COORDINATES.LNG.MIN ||
    parsedLongitude > LIMITS.COORDINATES.LNG.MAX
  ) {
    throw ServiceError.badRequest('Invalid coordinates');
  }

  return {
    latitude: roundCoordinate(parsedLatitude),
    longitude: roundCoordinate(parsedLongitude),
  };
};

/**
 * SQL fragment for user report statistics.
 * Centralized here so the definition of "verified" or "rejected" is in ONE place.
 * If the business rule changes (e.g., "verified" now includes "published"),
 * you only change it here.
 */
const USER_STATS_SELECT = `
  (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND is_draft = FALSE) as total_reports,
  (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND status IN ('verified', 'dispatched', 'on_scene', 'police_closed', 'resolved') AND is_draft = FALSE) as verified_reports,
  (SELECT COUNT(*) FROM incidents WHERE reporter_id = u.user_id AND status = 'rejected' AND is_draft = FALSE) as rejected_reports
`;

/**
 * Format a raw database user row into API response format
 * @param {Object} user - Raw user row from database
 * @returns {Object} Formatted user object
 */
function formatUserResponse(user) {
  return {
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
  };
}

/**
 * Get all users with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} [filters.role] - Filter by user role
 * @param {number} [filters.limit=50] - Max results to return
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Promise<Array>} Array of formatted user objects
 */
async function getAllUsers(filters = {}) {
  const { role, limit = 50, offset = 0 } = filters;

  let query = `
    SELECT 
      user_id, username, email, role, is_suspended, created_at,
      ${USER_STATS_SELECT}
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

  return users.map(formatUserResponse);
}

/**
 * Get a single user by ID with their report statistics
 * @param {number} userId - The user's ID
 * @returns {Promise<Object>} Formatted user object
 * @throws {ServiceError} If user not found
 */
async function getUserById(userId) {
  const user = await db.oneOrNone(
    `SELECT 
      user_id, username, email, role, is_suspended, created_at,
      ${USER_STATS_SELECT}
    FROM users u
    WHERE user_id = $1`,
    [userId]
  );

  if (!user) {
    throw ServiceError.notFound('User');
  }

  return formatUserResponse(user);
}

/**
 * Update a user's suspension status
 * @param {number} userId - The user's ID
 * @param {boolean} isSuspended - Whether to suspend or unsuspend
 * @returns {Promise<Object>} Updated user object
 * @throws {ServiceError} If user not found
 */
async function updateUserSuspension(userId, isSuspended) {
  // First check if user exists
  const existingUser = await db.oneOrNone(
    'SELECT * FROM users WHERE user_id = $1',
    [userId]
  );

  if (!existingUser) {
    throw ServiceError.notFound('User');
  }

  const updatedUser = await db.one(
    'UPDATE users SET is_suspended = $1 WHERE user_id = $2 RETURNING *',
    [isSuspended, userId]
  );

  return {
    id: updatedUser.user_id,
    name: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role,
    isSuspended: updatedUser.is_suspended,
  };
}

/**
 * Update a user's role
 * @param {number} userId - The user's ID
 * @param {string} role - New role value
 * @returns {Promise<Object>} Updated user object
 * @throws {ServiceError} If user not found
 */
async function updateUserRole(userId, role) {
  const existingUser = await db.oneOrNone(
    'SELECT * FROM users WHERE user_id = $1',
    [userId]
  );

  if (!existingUser) {
    throw ServiceError.notFound('User');
  }

  const updatedUser = await db.one(
    'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING *',
    [role, userId]
  );

  return {
    id: updatedUser.user_id,
    name: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role,
    isSuspended: updatedUser.is_suspended,
  };
}

async function updatePushToken(userId, token) {
  const normalizedToken = typeof token === 'string' ? token.trim() : '';

  if (!normalizedToken) {
    throw ServiceError.badRequest('Push token is required');
  }

  const user = await db.oneOrNone(
    'SELECT location_consent FROM users WHERE user_id = $1',
    [userId]
  );

  if (!user) {
    throw ServiceError.notFound('User');
  }

  if (!user.location_consent) {
    throw ServiceError.forbidden('Location consent is required before storing a push token');
  }

  await db.none(
    `UPDATE users
     SET push_token = $2,
         push_token_updated_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, normalizedToken]
  );
}

async function setLocationConsent(userId, consent) {
  if (typeof consent !== 'boolean') {
    throw ServiceError.badRequest('Consent must be a boolean');
  }

  const result = consent
    ? await db.result(
        `UPDATE users
         SET location_consent = TRUE,
             location_consent_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      )
    : await db.result(
        `UPDATE users
         SET location_consent = FALSE,
             last_known_latitude = NULL,
             last_known_longitude = NULL,
             location_updated_at = NULL,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

  if (result.rowCount === 0) {
    throw ServiceError.notFound('User');
  }
}

async function updateUserLocation(userId, latitude, longitude) {
  const rounded = validateCoordinates(latitude, longitude);
  const user = await db.oneOrNone(
    'SELECT location_consent FROM users WHERE user_id = $1',
    [userId]
  );

  if (!user) {
    throw ServiceError.notFound('User');
  }

  if (!user.location_consent) {
    throw ServiceError.forbidden('Location consent is required before storing location');
  }

  await db.none(
    `UPDATE users
     SET last_known_latitude = $2,
         last_known_longitude = $3,
         location_updated_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, rounded.latitude, rounded.longitude]
  );
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUserSuspension,
  updateUserRole,
  updatePushToken,
  setLocationConsent,
  updateUserLocation,
};
