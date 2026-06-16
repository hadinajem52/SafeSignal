/**
 * Saved Area Service
 * User-defined areas (home/work/etc.) for per-area activity scores.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

const MAX_AREAS = 10;

async function listAreas(userId) {
  return db.manyOrNone(
    `SELECT area_id, label, latitude, longitude, radius_km, created_at
     FROM saved_areas
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
}

async function createArea(userId, { label, latitude, longitude, radiusKm }) {
  const { count } = await db.one(
    'SELECT COUNT(*)::int AS count FROM saved_areas WHERE user_id = $1',
    [userId]
  );
  if (count >= MAX_AREAS) {
    throw ServiceError.badRequest(`You can save up to ${MAX_AREAS} areas`);
  }

  const cleanLabel = (String(label || '').trim() || 'Saved area').slice(0, 100);
  const radius = Number(radiusKm);
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 1;

  return db.one(
    `INSERT INTO saved_areas (user_id, label, latitude, longitude, radius_km)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING area_id, label, latitude, longitude, radius_km, created_at`,
    [userId, cleanLabel, latitude, longitude, safeRadius]
  );
}

async function deleteArea(userId, areaId) {
  const result = await db.result(
    'DELETE FROM saved_areas WHERE area_id = $1 AND user_id = $2',
    [areaId, userId]
  );
  if (result.rowCount === 0) {
    throw ServiceError.notFound('Saved area');
  }
}

module.exports = {
  listAreas,
  createArea,
  deleteArea,
};
