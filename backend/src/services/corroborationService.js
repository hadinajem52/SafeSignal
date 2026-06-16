/**
 * Corroboration Service
 * Lightweight community "I saw this too" signals on incidents.
 * Kept separate from the constellation/witness pipeline (table: incident_seen_marks).
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const incidentService = require('./incidentService');

async function getCounts(incidentId, userId) {
  const row = await db.one(
    `SELECT
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE user_id = $2)::int AS mine
     FROM incident_seen_marks
     WHERE incident_id = $1`,
    [incidentId, userId]
  );
  return { count: row.count, hasCorroborated: row.mine > 0 };
}

async function getCorroborationState(incidentId, user) {
  await incidentService.assertIncidentInteractable(incidentId, user);
  return getCounts(incidentId, user.userId);
}

async function addCorroboration(incidentId, user) {
  const incident = await incidentService.assertIncidentInteractable(incidentId, user);
  if (Number(incident.reporter_id) === Number(user.userId)) {
    throw ServiceError.badRequest('You cannot corroborate your own report');
  }
  await db.none(
    `INSERT INTO incident_seen_marks (incident_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (incident_id, user_id) DO NOTHING`,
    [incidentId, user.userId]
  );
  return getCounts(incidentId, user.userId);
}

async function removeCorroboration(incidentId, user) {
  await incidentService.assertIncidentInteractable(incidentId, user);
  await db.none(
    'DELETE FROM incident_seen_marks WHERE incident_id = $1 AND user_id = $2',
    [incidentId, user.userId]
  );
  return getCounts(incidentId, user.userId);
}

module.exports = {
  getCorroborationState,
  addCorroboration,
  removeCorroboration,
};
