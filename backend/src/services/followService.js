/**
 * Follow Service
 * Lets a user follow an incident to receive status-change notifications.
 */

const db = require('../config/database');
const incidentService = require('./incidentService');

async function getFollowState(incidentId, user) {
  await incidentService.assertIncidentInteractable(incidentId, user);
  const row = await db.oneOrNone(
    'SELECT 1 FROM incident_follows WHERE incident_id = $1 AND user_id = $2',
    [incidentId, user.userId]
  );
  return { following: Boolean(row) };
}

async function followIncident(incidentId, user) {
  await incidentService.assertIncidentInteractable(incidentId, user);
  await db.none(
    `INSERT INTO incident_follows (incident_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (incident_id, user_id) DO NOTHING`,
    [incidentId, user.userId]
  );
  return { following: true };
}

async function unfollowIncident(incidentId, user) {
  await db.none(
    'DELETE FROM incident_follows WHERE incident_id = $1 AND user_id = $2',
    [incidentId, user.userId]
  );
  return { following: false };
}

module.exports = {
  getFollowState,
  followIncident,
  unfollowIncident,
};
