const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const logger = require('../utils/logger');
const mlClient = require('../utils/mlClient');
const constellationSynthesis = require('./constellationSynthesis');
const fcmClient = require('../utils/fcmClient');
const { containsPii } = require('../utils/piiScanner');
const { LIMITS } = require('../../../constants/limits');

const STAFF_ROLES = new Set(['admin', 'moderator', 'law_enforcement']);
const VALID_SIGNAL_TYPES = new Set([
  'saw_something',
  'heard_something',
  'nothing_unusual',
  'not_sure',
  'already_left',
]);

const roundCoordinate = (value) => Number(Number(value).toFixed(2));

const parseCoordinate = (value, limits, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < limits.MIN || parsed > limits.MAX) {
    throw ServiceError.badRequest(`Invalid ${label}`);
  }
  return parsed;
};

const normalizeDeviceCoordinates = (latitude, longitude) => {
  const hasLatitude = latitude !== undefined && latitude !== null;
  const hasLongitude = longitude !== undefined && longitude !== null;

  if (!hasLatitude && !hasLongitude) {
    return { latitude: null, longitude: null };
  }

  if (!hasLatitude || !hasLongitude) {
    throw ServiceError.badRequest('Device latitude and longitude must be provided together');
  }

  return {
    latitude: roundCoordinate(parseCoordinate(latitude, LIMITS.COORDINATES.LAT, 'device latitude')),
    longitude: roundCoordinate(parseCoordinate(longitude, LIMITS.COORDINATES.LNG, 'device longitude')),
  };
};

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const isStaffRole = (role) => STAFF_ROLES.has(role);

const isFreshIncident = (incidentDate) => {
  const reportedAt = new Date(incidentDate).getTime();
  if (!Number.isFinite(reportedAt)) {
    return false;
  }

  const ageMs = Date.now() - reportedAt;
  return ageMs >= 0 && ageMs <= LIMITS.CONSTELLATION.ELIGIBILITY_WINDOW_MINUTES * 60 * 1000;
};

const hasCoordinates = (incident) => {
  const latitude = Number(incident.latitude);
  const longitude = Number(incident.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

const computeDistanceMeters = (fromLatitude, fromLongitude, toLatitude, toLongitude) => {
  if (fromLatitude === null || fromLongitude === null) {
    return null;
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRadians(fromLatitude))
    * Math.cos(toRadians(toLatitude))
    * Math.sin(deltaLongitude / 2) ** 2;

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatFullConstellation = (row) => ({
  constellationId: row.constellation_id,
  incidentId: row.incident_id,
  reporterId: row.reporter_id,
  status: row.status,
  centerLatitude: toNumber(row.center_latitude),
  centerLongitude: toNumber(row.center_longitude),
  radiusMeters: row.radius_meters,
  opensAt: row.opens_at,
  expiresAt: row.expires_at,
  confidenceState: row.confidence_state,
  confidenceScore: toNumber(row.confidence_score),
  summary: row.summary,
  supportingSignals: row.supporting_signals,
  contradictingSignals: row.contradicting_signals,
  ongoingAssessment: row.ongoing_assessment,
  hasUnprocessedChanges: row.has_unprocessed_changes,
});

const formatLimitedConstellation = (row) => {
  const payload = {
    constellationId: row.constellation_id,
    incidentId: row.incident_id,
    status: row.status,
    expiresAt: row.expires_at,
  };

  if (row.status !== 'flagged') {
    payload.centerLatitude = roundCoordinate(row.center_latitude);
    payload.centerLongitude = roundCoordinate(row.center_longitude);
    payload.radiusMeters = row.radius_meters;
  }

  return payload;
};

async function evaluateEligibility(incident, reporterId) {
  if (!incident || incident.is_draft) {
    return { eligible: false, reason: 'draft_incident' };
  }

  if (!hasCoordinates(incident)) {
    return { eligible: false, reason: 'missing_coordinates' };
  }

  if (!isFreshIncident(incident.incident_date)) {
    return { eligible: false, reason: 'stale_incident' };
  }

  if (incident.status === 'auto_flagged') {
    return { eligible: false, reason: 'toxic_or_abusive' };
  }

  const toxicity = await db.oneOrNone(
    `SELECT rm.is_toxic
     FROM reports r
     JOIN report_ml rm ON rm.report_id = r.report_id
     WHERE r.incident_id = $1
     ORDER BY rm.created_at DESC
     LIMIT 1`,
    [incident.incident_id]
  );

  if (toxicity?.is_toxic) {
    return { eligible: false, reason: 'toxic_or_abusive' };
  }

  const active = await db.oneOrNone(
    `SELECT constellation_id
     FROM incident_constellations
     WHERE incident_id = $1
       AND status = 'active'
       AND expires_at > NOW()
     LIMIT 1`,
    [incident.incident_id]
  );

  if (active) {
    return { eligible: false, reason: 'active_constellation_exists' };
  }

  const recent = await db.one(
    `SELECT COUNT(*)::int AS count
     FROM incident_constellations c
     JOIN incidents i ON i.incident_id = c.incident_id
     WHERE i.reporter_id = $1
       AND c.opens_at > NOW() - ($2::text)::interval`,
    [reporterId, `${LIMITS.CONSTELLATION.CREATION_WINDOW_MINUTES} minutes`]
  );

  if (recent.count >= LIMITS.CONSTELLATION.CREATION_LIMIT) {
    return { eligible: false, reason: 'creation_rate_limited' };
  }

  return { eligible: true, reason: null };
}

async function createConstellation(incident) {
  return db.one(
    `INSERT INTO incident_constellations (
       incident_id,
       center_latitude,
       center_longitude,
       radius_meters,
       expires_at
     ) VALUES (
       $1, $2, $3, $4, NOW() + ($5::text)::interval
     )
     RETURNING *`,
    [
      incident.incident_id,
      Number(incident.latitude),
      Number(incident.longitude),
      LIMITS.CONSTELLATION.RADIUS_METERS,
      `${LIMITS.CONSTELLATION.EXPIRY_HOURS} hours`,
    ]
  );
}

async function openConstellationForIncident(incident, reporterId) {
  const eligibility = await evaluateEligibility(incident, reporterId);
  if (!eligibility.eligible) {
    return { created: false, reason: eligibility.reason, constellation: null };
  }

  try {
    const constellation = await createConstellation(incident);
    notifyNearbyUsers(constellation).catch((error) => {
      logger.error(`Witness prompt notification failed for constellation ${constellation.constellation_id}: ${error.message}`);
    });
    return { created: true, reason: null, constellation };
  } catch (error) {
    if (error.code === '23505') {
      return { created: false, reason: 'active_constellation_exists', constellation: null };
    }
    throw error;
  }
}

async function createPromptDelivery(userId, constellationId) {
  return db.oneOrNone(
    `INSERT INTO witness_prompt_deliveries (user_id, constellation_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, constellation_id) DO NOTHING
     RETURNING delivery_id`,
    [userId, constellationId]
  );
}

async function getPushThrottleCounts(userId) {
  const counts = await db.one(
    `SELECT
       COUNT(*) FILTER (
         WHERE sent_at > NOW() - ($2::text)::interval
       )::int AS cooldown_count,
       COUNT(*) FILTER (
         WHERE sent_at > NOW() - ($3::text)::interval
       )::int AS hourly_count
     FROM witness_prompt_deliveries
     WHERE user_id = $1
       AND status = 'sent'`,
    [
      userId,
      `${LIMITS.CONSTELLATION.PUSH_COOLDOWN_MINUTES} minutes`,
      '60 minutes',
    ]
  );

  return {
    cooldownCount: Number(counts.cooldown_count || 0),
    hourlyCount: Number(counts.hourly_count || 0),
  };
}

function getSuppressionReason({ cooldownCount, hourlyCount }) {
  if (hourlyCount >= LIMITS.CONSTELLATION.PUSH_HOURLY_LIMIT) {
    return 'hourly_rate_limited';
  }

  if (cooldownCount > 0) {
    return 'cooldown_rate_limited';
  }

  return null;
}

async function markPromptDelivery(deliveryId, status, fields = {}) {
  await db.none(
    `UPDATE witness_prompt_deliveries
     SET status = $2,
         suppression_reason = $3,
         error_message = $4,
         sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END,
         updated_at = NOW()
     WHERE delivery_id = $1`,
    [
      deliveryId,
      status,
      fields.suppressionReason || null,
      fields.errorMessage || null,
    ]
  );
}

async function sendWitnessPrompt(target, constellation) {
  const delivery = await createPromptDelivery(target.user_id, constellation.constellation_id);
  if (!delivery) {
    return 'skipped';
  }

  const suppressionReason = getSuppressionReason(await getPushThrottleCounts(target.user_id));
  if (suppressionReason) {
    await markPromptDelivery(delivery.delivery_id, 'suppressed', { suppressionReason });
    return 'suppressed';
  }

  const result = await fcmClient.sendWitnessPromptNotification(target.push_token, {
    constellationId: constellation.constellation_id,
    coarseLatitude: roundCoordinate(constellation.center_latitude),
    coarseLongitude: roundCoordinate(constellation.center_longitude),
  });

  if (result.sent) {
    await markPromptDelivery(delivery.delivery_id, 'sent');
    return 'sent';
  }

  await markPromptDelivery(delivery.delivery_id, 'failed', {
    errorMessage: result.error || 'Notification was not sent',
  });
  return 'skipped';
}

async function notifyNearbyUsers(constellation) {
  const targets = await db.manyOrNone(
    `SELECT u.user_id, u.push_token
     FROM users u
     JOIN incidents i ON i.incident_id = $1
     WHERE u.push_token IS NOT NULL
       AND u.push_token_updated_at > NOW() - INTERVAL '7 days'
       AND u.location_consent = TRUE
       AND u.location_updated_at > NOW() - INTERVAL '24 hours'
       AND u.is_suspended = FALSE
       AND u.user_id <> i.reporter_id
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(u.last_known_longitude::float, u.last_known_latitude::float), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2::float, $3::float), 4326)::geography,
         $4
       )
     LIMIT 200`,
    [
      constellation.incident_id,
      Number(constellation.center_longitude),
      Number(constellation.center_latitude),
      constellation.radius_meters,
    ]
  );

  let sent = 0;
  let skipped = 0;
  let suppressed = 0;

  await Promise.all(targets.map(async (target) => {
    const status = await sendWitnessPrompt(target, constellation);

    if (status === 'sent') {
      sent += 1;
    } else if (status === 'suppressed') {
      suppressed += 1;
    } else {
      skipped += 1;
    }
  }));

  logger.info(`Witness prompt notifications for constellation ${constellation.constellation_id}: sent=${sent}, suppressed=${suppressed}, skipped=${skipped}`);

  return { sent, suppressed, skipped, targetCount: targets.length };
}

async function isUserInRadius(userId, constellationId) {
  const result = await db.oneOrNone(
    `SELECT 1
     FROM users u
     JOIN incident_constellations c ON c.constellation_id = $2
     WHERE u.user_id = $1
       AND u.location_consent = TRUE
       AND u.last_known_latitude IS NOT NULL
       AND u.last_known_longitude IS NOT NULL
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(u.last_known_longitude::float, u.last_known_latitude::float), 4326)::geography,
         ST_SetSRID(ST_MakePoint(c.center_longitude::float, c.center_latitude::float), 4326)::geography,
         c.radius_meters
       )`,
    [userId, constellationId]
  );

  return Boolean(result);
}

async function getConstellationForUser(constellationId, userId, userRole) {
  const row = await db.oneOrNone(
    `SELECT c.*, i.reporter_id
     FROM incident_constellations c
     JOIN incidents i ON i.incident_id = c.incident_id
     WHERE c.constellation_id = $1`,
    [constellationId]
  );

  if (!row) {
    return null;
  }

  if (isStaffRole(userRole)) {
    return formatFullConstellation(row);
  }

  if (row.reporter_id !== userId && !(await isUserInRadius(userId, constellationId))) {
    return null;
  }

  return formatLimitedConstellation(row);
}

const normalizeNote = (note) => {
  if (note === undefined || note === null) {
    return null;
  }

  const trimmed = String(note).trim();
  return trimmed ? trimmed.slice(0, LIMITS.CONSTELLATION.NOTE_MAX_LENGTH) : null;
};

const isValidToxicityResult = (result) => result
  && typeof result.isToxic === 'boolean'
  && typeof result.isSevere === 'boolean';

async function shouldFlagNote(note, context) {
  if (!note) {
    return false;
  }

  const hasPii = containsPii(note);

  try {
    const toxicity = await mlClient.detectToxicity(note);
    if (!isValidToxicityResult(toxicity)) {
      logger.warn('Constellation note toxicity check returned invalid result', context);
      return true;
    }

    return hasPii || toxicity.isToxic || toxicity.isSevere;
  } catch (error) {
    logger.warn('Constellation note toxicity check failed', {
      ...context,
      error: error.message,
    });
    return true;
  }
}

async function submitCorroboration(constellationId, userId, payload) {
  if (!VALID_SIGNAL_TYPES.has(payload.signalType)) {
    throw ServiceError.badRequest('Invalid signal type');
  }

  const constellation = await db.oneOrNone(
    `SELECT c.*, i.reporter_id
     FROM incident_constellations c
     JOIN incidents i ON i.incident_id = c.incident_id
     WHERE c.constellation_id = $1`,
    [constellationId]
  );

  if (!constellation) {
    return null;
  }

  if (constellation.status === 'flagged') {
    throw ServiceError.conflict('Constellation is under review');
  }

  if (constellation.status === 'expired' || new Date(constellation.expires_at).getTime() <= Date.now()) {
    throw ServiceError.conflict('Constellation has expired');
  }

  if (constellation.status !== 'active') {
    return null;
  }

  if (constellation.reporter_id === userId) {
    throw ServiceError.forbidden('Reporter cannot corroborate their own constellation');
  }

  const recent = await db.one(
    `SELECT COUNT(*)::int AS count
     FROM incident_corroborations
     WHERE user_id = $1
       AND submitted_at > NOW() - ($2::text)::interval`,
    [userId, `${LIMITS.CONSTELLATION.CORROBORATION_WINDOW_MINUTES} minutes`]
  );

  if (recent.count >= LIMITS.CONSTELLATION.CORROBORATION_LIMIT) {
    throw new ServiceError('Corroboration rate limit exceeded', 429, 'RATE_LIMITED');
  }

  const note = normalizeNote(payload.note);
  const device = normalizeDeviceCoordinates(payload.deviceLatitude, payload.deviceLongitude);
  const noteFlaggedPii = await shouldFlagNote(note, { constellationId, userId });
  const distanceMeters = computeDistanceMeters(
    device.latitude,
    device.longitude,
    Number(constellation.center_latitude),
    Number(constellation.center_longitude)
  );

  try {
    const created = await db.one(
      `INSERT INTO incident_corroborations (
         constellation_id,
         user_id,
         signal_type,
         note,
         note_flagged_pii,
         distance_meters,
         device_latitude_rounded,
         device_longitude_rounded
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING corroboration_id`,
      [
        constellationId,
        userId,
        payload.signalType,
        note,
        noteFlaggedPii,
        distanceMeters,
        device.latitude,
        device.longitude,
      ]
    );

    await db.none(
      `UPDATE incident_constellations
       SET has_unprocessed_changes = TRUE,
           updated_at = NOW()
       WHERE constellation_id = $1`,
      [constellationId]
    );

    constellationSynthesis.triggerSynthesis(constellationId).catch((error) => {
      logger.error(`Constellation synthesis failed for ${constellationId}: ${error.message}`);
    });

    return { corroboration_id: created.corroboration_id };
  } catch (error) {
    if (error.code === '23505') {
      throw ServiceError.conflict('User has already corroborated this constellation');
    }
    throw error;
  }
}

module.exports = {
  STAFF_ROLES,
  VALID_SIGNAL_TYPES,
  evaluateEligibility,
  createConstellation,
  openConstellationForIncident,
  notifyNearbyUsers,
  isUserInRadius,
  getConstellationForUser,
  submitCorroboration,
};
