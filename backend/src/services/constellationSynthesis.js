const db = require('../config/database');
const logger = require('../utils/logger');
const mlClient = require('../utils/mlClient');

const CONFIDENCE_STATES = new Set([
  'single_report',
  'corroborated',
  'mixed_signals',
  'activity_not_confirmed',
  'likely_ended',
]);

const ONGOING_ASSESSMENTS = new Set(['ongoing', 'likely_ended', 'unknown', 'unclear']);
const SUPPORTING_SIGNALS = new Set(['saw_something', 'heard_something']);
const CONTRADICTING_SIGNALS = new Set(['nothing_unusual', 'already_left']);
const NEUTRAL_SIGNAL = 'not_sure';

const clampScore = (value) => Number(Math.min(Math.max(value, 0), 1).toFixed(3));

const countSignals = (corroborations) => {
  const counts = {
    supporting: 0,
    contradicting: 0,
    neutral: 0,
    byType: {},
  };

  corroborations.forEach((corroboration) => {
    const signalType = corroboration.signal_type;
    counts.byType[signalType] = (counts.byType[signalType] || 0) + 1;

    if (SUPPORTING_SIGNALS.has(signalType)) {
      counts.supporting += 1;
    } else if (CONTRADICTING_SIGNALS.has(signalType)) {
      counts.contradicting += 1;
    } else if (signalType === NEUTRAL_SIGNAL) {
      counts.neutral += 1;
    }
  });

  return counts;
};

const getMajoritySignal = (byType) => Object.entries(byType)
  .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

function computeFallbackState(corroborations, constellation) {
  const total = corroborations.length;
  const counts = countSignals(corroborations);

  if (total === 0) {
    return {
      confidenceState: 'single_report',
      confidenceScore: 0,
      supportingSignals: 0,
      contradictingSignals: 0,
      ongoingAssessment: 'unknown',
      summary: null,
      anomalyFlagged: false,
      clusterMatchIncidentIds: [],
    };
  }

  const denominator = counts.supporting + counts.contradicting + 0.5 * counts.neutral;
  const score = denominator === 0 ? 0 : clampScore(counts.supporting / denominator);
  const majoritySignal = getMajoritySignal(counts.byType);
  const ageMinutes = (Date.now() - new Date(constellation.opens_at).getTime()) / 60000;
  let confidenceState = 'single_report';
  let ongoingAssessment = 'unknown';

  if (
    majoritySignal === 'already_left'
    || (majoritySignal === 'nothing_unusual' && ageMinutes > 60)
  ) {
    confidenceState = 'likely_ended';
    ongoingAssessment = 'likely_ended';
  } else if (majoritySignal === 'nothing_unusual') {
    confidenceState = 'activity_not_confirmed';
    ongoingAssessment = 'unclear';
  } else if (counts.supporting >= 3 && counts.supporting > counts.contradicting && score >= 0.65) {
    confidenceState = 'corroborated';
    ongoingAssessment = 'ongoing';
  } else if (counts.contradicting / total >= 0.4) {
    confidenceState = 'mixed_signals';
    ongoingAssessment = 'unclear';
  }

  return {
    confidenceState,
    confidenceScore: score,
    supportingSignals: counts.supporting,
    contradictingSignals: counts.contradicting,
    ongoingAssessment,
    summary: null,
    anomalyFlagged: false,
    clusterMatchIncidentIds: [],
  };
}

const sanitizeCorroborationForMl = (corroboration) => ({
  signal_type: corroboration.signal_type,
  note: corroboration.note_flagged_pii ? null : corroboration.note,
  note_flagged_pii: Boolean(corroboration.note_flagged_pii),
  distance_meters: corroboration.distance_meters,
  submitted_at: corroboration.submitted_at,
});

const buildMlPayload = (constellation, incident, corroborations) => ({
  constellation_id: constellation.constellation_id,
  incident_metadata: {
    category: incident.category,
    severity: incident.severity,
    incident_date: incident.incident_date,
  },
  corroborations: corroborations.map(sanitizeCorroborationForMl),
  opens_at: constellation.opens_at,
  current_time: new Date().toISOString(),
});

const normalizeMlResult = (result) => {
  if (!result) {
    return null;
  }

  const score = Number(result.confidenceScore);
  if (
    !CONFIDENCE_STATES.has(result.confidenceState)
    || !ONGOING_ASSESSMENTS.has(result.ongoingAssessment)
    || !Number.isFinite(score)
    || score < 0
    || score > 1
  ) {
    return null;
  }

  return {
    confidenceState: result.confidenceState,
    confidenceScore: clampScore(score),
    summary: typeof result.summary === 'string' && result.summary.trim() ? result.summary.trim() : null,
    supportingSignals: Number.isInteger(result.supportingSignals) && result.supportingSignals >= 0
      ? result.supportingSignals
      : 0,
    contradictingSignals: Number.isInteger(result.contradictingSignals) && result.contradictingSignals >= 0
      ? result.contradictingSignals
      : 0,
    ongoingAssessment: result.ongoingAssessment,
    anomalyFlagged: Boolean(result.anomalyFlagged),
    clusterMatchIncidentIds: Array.isArray(result.clusterMatchIncidentIds)
      ? result.clusterMatchIncidentIds.filter(Number.isInteger)
      : [],
  };
};

function detectVelocityCap(corroborations) {
  const byGrid = new Map();

  corroborations.forEach((corroboration) => {
    if (
      corroboration.device_latitude_rounded === null
      || corroboration.device_latitude_rounded === undefined
      || corroboration.device_longitude_rounded === null
      || corroboration.device_longitude_rounded === undefined
    ) {
      return;
    }

    const key = `${Number(corroboration.device_latitude_rounded).toFixed(2)},${Number(corroboration.device_longitude_rounded).toFixed(2)}`;
    const timestamps = byGrid.get(key) || [];
    timestamps.push(new Date(corroboration.submitted_at).getTime());
    byGrid.set(key, timestamps);
  });

  for (const timestamps of byGrid.values()) {
    timestamps.sort((a, b) => a - b);
    for (let start = 0; start < timestamps.length; start += 1) {
      const end = start + 4;
      if (timestamps[end] && timestamps[end] - timestamps[start] <= 60000) {
        return true;
      }
    }
  }

  return false;
}

async function deriveClusterCandidates(constellation, incident) {
  return db.manyOrNone(
    `SELECT c.constellation_id
     FROM incident_constellations c
     JOIN incidents i ON i.incident_id = c.incident_id
     WHERE c.constellation_id <> $1
       AND c.status = 'active'
       AND c.expires_at > NOW()
       AND ABS(EXTRACT(EPOCH FROM (i.incident_date - $4::timestamptz))) <= 1800
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(c.center_longitude::float, c.center_latitude::float), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2::float, $3::float), 4326)::geography,
         300
       )`,
    [
      constellation.constellation_id,
      Number(constellation.center_longitude),
      Number(constellation.center_latitude),
      incident.incident_date,
    ]
  );
}

async function persistClusterLinks(constellationId, candidates) {
  for (const candidate of candidates) {
    const linkedId = candidate.constellation_id;
    const lowerId = Math.min(constellationId, linkedId);
    const upperId = Math.max(constellationId, linkedId);

    await db.none(
      `INSERT INTO constellation_cluster_links (constellation_id, linked_constellation_id)
       VALUES ($1, $2)
       ON CONFLICT (constellation_id, linked_constellation_id) DO NOTHING`,
      [lowerId, upperId]
    );
  }
}

async function loadSynthesisInputs(constellationId) {
  const constellation = await db.oneOrNone(
    `SELECT c.*, i.incident_id, i.category, i.severity, i.incident_date
     FROM incident_constellations c
     JOIN incidents i ON i.incident_id = c.incident_id
     WHERE c.constellation_id = $1`,
    [constellationId]
  );

  if (!constellation) {
    return null;
  }

  const corroborations = await db.manyOrNone(
    `SELECT *
     FROM incident_corroborations
     WHERE constellation_id = $1
     ORDER BY submitted_at ASC`,
    [constellationId]
  );

  return {
    constellation,
    incident: {
      incident_id: constellation.incident_id,
      category: constellation.category,
      severity: constellation.severity,
      incident_date: constellation.incident_date,
    },
    corroborations,
  };
}

async function triggerSynthesis(constellationId) {
  const inputs = await loadSynthesisInputs(constellationId);
  if (!inputs) {
    return null;
  }

  const { constellation, incident, corroborations } = inputs;
  const previousScore = Number(constellation.confidence_score) || 0;
  const mlPayload = buildMlPayload(constellation, incident, corroborations);
  const mlState = normalizeMlResult(await mlClient.synthesizeConstellation(mlPayload));
  let fallbackState = null;

  try {
    fallbackState = computeFallbackState(corroborations, constellation);
  } catch (error) {
    logger.error(`Constellation fallback synthesis failed for ${constellationId}: ${error.message}`);
  }

  const previousState = {
    confidenceState: constellation.confidence_state || 'single_report',
    confidenceScore: previousScore,
    summary: constellation.summary || null,
    supportingSignals: Number(constellation.supporting_signals) || 0,
    contradictingSignals: Number(constellation.contradicting_signals) || 0,
    ongoingAssessment: constellation.ongoing_assessment || 'unknown',
    anomalyFlagged: false,
    clusterMatchIncidentIds: [],
  };
  const selected = mlState || fallbackState || previousState;
  const source = mlState ? 'ml' : fallbackState ? 'fallback' : 'previous';
  const velocityAnomaly = detectVelocityCap(corroborations);
  const anomalyFlagged = selected.anomalyFlagged || velocityAnomaly;
  const finalScore = anomalyFlagged
    ? Math.min(selected.confidenceScore, previousScore)
    : selected.confidenceScore;
  const finalStatus = anomalyFlagged ? 'flagged' : constellation.status;
  const clusterCandidates = await deriveClusterCandidates(constellation, incident);

  if (mlState?.clusterMatchIncidentIds.length) {
    logger.info('ML constellation cluster candidates ignored for MVP persistence', {
      constellationId,
      clusterMatchIncidentIds: mlState.clusterMatchIncidentIds,
    });
  }

  await db.none(
    `UPDATE incident_constellations
     SET status = $2,
         confidence_state = $3,
         confidence_score = $4,
         summary = $5,
         supporting_signals = $6,
         contradicting_signals = $7,
         ongoing_assessment = $8,
         last_synthesized_at = NOW(),
         has_unprocessed_changes = FALSE,
         updated_at = NOW()
     WHERE constellation_id = $1`,
    [
      constellationId,
      finalStatus,
      selected.confidenceState,
      clampScore(finalScore),
      selected.summary,
      selected.supportingSignals,
      selected.contradictingSignals,
      selected.ongoingAssessment,
    ]
  );

  await persistClusterLinks(constellationId, clusterCandidates);

  logger.info(`Constellation ${constellationId} synthesized with ${source}`);

  return {
    source,
    status: finalStatus,
    confidenceState: selected.confidenceState,
    confidenceScore: clampScore(finalScore),
    anomalyFlagged,
    clusterLinkCount: clusterCandidates.length,
  };
}

module.exports = {
  computeFallbackState,
  triggerSynthesis,
  detectVelocityCap,
};
