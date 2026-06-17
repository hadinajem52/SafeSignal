/**
 * Incident Service
 * Handles all business logic for incident management.
 * Routes should only handle HTTP concerns (parsing requests, sending responses).
 * This service handles business rules and database interactions.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const logger = require('../utils/logger');
const Filter = require('bad-words');
const crypto = require('crypto');
const mlClient = require('../utils/mlClient');

const {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,
  VALID_CLOSURE_OUTCOMES,
} = require('../../../constants/incident');
const { LIMITS } = require('../../../constants/limits');
const { emitToRoles } = require('../utils/socketService');
const settingsService = require('./settingsService');
const notificationService = require('./notificationService');
const mediaJudgmentService = require('./mediaJudgmentService');

const LEI_STATUSES = ['verified', 'dispatched', 'on_scene', 'investigating', 'police_closed'];
const STAFF_ROLES = new Set(['admin', 'moderator', 'law_enforcement']);
const PUBLIC_DETAIL_MEDIA_STATUSES = new Set(['police_closed', 'resolved', 'published']);
const ACTIONABLE_MODERATION_STATUSES = new Set(['submitted', 'auto_processed', 'auto_flagged', 'in_review', 'needs_info']);
const FIRST_ACTION_STATUSES = new Set([
  'auto_processed',
  'auto_flagged',
  'in_review',
  'verified',
  'dispatched',
  'on_scene',
  'investigating',
  'police_closed',
  'rejected',
  'needs_info',
  'published',
  'resolved',
  'archived',
  'merged',
]);
const CLOSED_STATUSES = new Set(['police_closed', 'resolved', 'archived']);
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const shouldIncludeStaffConstellation = (includeConstellation, userRole) =>
  Boolean(includeConstellation && STAFF_ROLES.has(userRole));
const profanityFilter = new Filter();

async function getDuplicateParentForReport(reportId) {
  return db.oneOrNone(
    `WITH RECURSIVE parent_chain(report_id, depth, path) AS (
       SELECT rl.canonical_report_id, 1, ARRAY[$1, rl.canonical_report_id]
       FROM report_links rl
       WHERE rl.duplicate_report_id = $1
         AND rl.link_type = 'duplicate'
       UNION ALL
       SELECT rl.canonical_report_id, pc.depth + 1, pc.path || rl.canonical_report_id
       FROM parent_chain pc
       JOIN report_links rl ON rl.duplicate_report_id = pc.report_id
         AND rl.link_type = 'duplicate'
       WHERE pc.depth < 20
         AND NOT rl.canonical_report_id = ANY(pc.path)
     )
     SELECT ci.*, cr.report_id AS report_id
     FROM parent_chain pc
     JOIN reports cr ON cr.report_id = pc.report_id
     JOIN incidents ci ON ci.incident_id = cr.incident_id
     ORDER BY pc.depth DESC
     LIMIT 1`,
    [reportId]
  );
}

function normalizeIdempotencyKey(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const key = String(value).trim();
  if (!key) {
    return null;
  }

  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw ServiceError.badRequest('Idempotency key is too long');
  }

  return key;
}

function normalizeIncidentDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function buildIncidentPayloadHash(incidentData, reporterId) {
  const latitude = Number(incidentData.latitude);
  const longitude = Number(incidentData.longitude);
  const payload = {
    reporterId,
    title: incidentData.title,
    description: incidentData.description,
    category: incidentData.category,
    latitude: Number.isFinite(latitude) ? latitude : incidentData.latitude,
    longitude: Number.isFinite(longitude) ? longitude : incidentData.longitude,
    locationName: incidentData.locationName || null,
    incidentDate: normalizeIncidentDate(incidentData.incidentDate),
    severity: incidentData.severity,
    isAnonymous: normalizeBoolean(incidentData.isAnonymous),
    isDraft: normalizeBoolean(incidentData.isDraft),
    enableMlClassification:
      incidentData.enableMlClassification === undefined
        ? true
        : normalizeBoolean(incidentData.enableMlClassification),
    enableMlRisk:
      incidentData.enableMlRisk === undefined
        ? true
        : normalizeBoolean(incidentData.enableMlRisk),
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Boolean(value);
}

function stripIncidentIdempotencyFields(incident) {
  if (!incident) {
    return incident;
  }

  const publicIncident = { ...incident };
  delete publicIncident.idempotency_key;
  delete publicIncident.idempotency_payload_hash;
  return publicIncident;
}

const CATEGORY_KEYWORDS = {
  theft: ['theft', 'stolen', 'robbery', 'burglary', 'break-in', 'shoplift', 'snatch', 'package theft'],
  assault: ['assault', 'fight', 'attack', 'battery', 'shooting', 'shot', 'gun', 'weapon', 'stab', 'knife', 'threat', 'terrorism'],
  vandalism: ['vandal', 'graffiti', 'damage', 'destroyed', 'defaced', 'keyed', 'smashed'],
  suspicious_activity: ['suspicious', 'loitering', 'prowler', 'lurking', 'casing', 'watching'],
  traffic_incident: ['traffic', 'crash', 'accident', 'collision', 'hit', 'hit-and-run', 'pileup', 'rear-ended'],
  noise_complaint: ['noise', 'loud', 'party', 'music', 'barking', 'fireworks', 'engine'],
  fire: ['fire', 'smoke', 'flames', 'burning', 'explosion'],
  medical_emergency: ['medical', 'injury', 'ambulance', 'unconscious', 'not breathing', 'seizure', 'choking', 'chest pain'],
  hazard: ['hazard', 'spill', 'gas', 'leak', 'danger', 'manhole', 'downed power line', 'broken glass', 'debris'],
};

const HIGH_RISK_KEYWORDS = [
  'weapon', 'gun', 'active shooter', 'fire', 'shooting', 'blood', 'knife',
  'explosion', 'not breathing', 'unconscious', 'heart attack', 'gas leak', 'hostage',
];

const URGENT_CONTEXT_KEYWORDS = ['trapped', 'children', 'child', 'school', 'crowd', 'multiple people', 'spreading'];
const DEESCALATION_PHRASES = ['no injuries', 'already contained', 'already under control', 'resolved', 'fire is out'];
const DEDUP_ENTITY_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'there', 'their', 'about',
  'incident', 'reported', 'report', 'someone', 'person', 'people', 'near', 'around',
  'outside', 'inside', 'street', 'avenue', 'road', 'boulevard', 'drive', 'lane',
  'court', 'place', 'highway', 'parkway', 'branch',
]);
const STREET_SUFFIX_MAP = {
  st: 'street',
  street: 'street',
  ave: 'avenue',
  avenue: 'avenue',
  rd: 'road',
  road: 'road',
  blvd: 'boulevard',
  boulevard: 'boulevard',
  dr: 'drive',
  drive: 'drive',
  ln: 'lane',
  lane: 'lane',
  ct: 'court',
  court: 'court',
  pl: 'place',
  place: 'place',
  hwy: 'highway',
  highway: 'highway',
  pkwy: 'parkway',
  parkway: 'parkway',
};
const NORMALIZED_STREET_SUFFIXES = new Set(Object.values(STREET_SUFFIX_MAP));

function getLifecycleTimestampUpdate(statusExpression, guardExpression = 'TRUE') {
  return `
         first_action_at = CASE
           WHEN ${guardExpression} AND ${statusExpression} IN ('${Array.from(FIRST_ACTION_STATUSES).join("','")}')
             THEN COALESCE(first_action_at, CURRENT_TIMESTAMP)
           ELSE first_action_at
         END,
         verified_at = CASE
           WHEN ${guardExpression} AND ${statusExpression} = 'verified' THEN COALESCE(verified_at, CURRENT_TIMESTAMP)
           ELSE verified_at
         END,
         dispatched_at = CASE
           WHEN ${guardExpression} AND ${statusExpression} = 'dispatched' THEN COALESCE(dispatched_at, CURRENT_TIMESTAMP)
           ELSE dispatched_at
         END,
         on_scene_at = CASE
           WHEN ${guardExpression} AND ${statusExpression} = 'on_scene' THEN COALESCE(on_scene_at, CURRENT_TIMESTAMP)
           ELSE on_scene_at
         END,
         closed_at = CASE
           WHEN ${guardExpression} AND ${statusExpression} IN ('${Array.from(CLOSED_STATUSES).join("','")}')
             THEN COALESCE(closed_at, CURRENT_TIMESTAMP)
           ELSE closed_at
         END,
         rejected_at = CASE
           WHEN ${guardExpression} AND ${statusExpression} = 'rejected' THEN COALESCE(rejected_at, CURRENT_TIMESTAMP)
           ELSE rejected_at
         END,`;
}

/**
 * Map an ML risk score (0–1) to a severity level.
 * Thresholds calibrated against the ML risk scorer's output range
 * (category_risk * 0.35 + sev_mult * 0.35 + keywords * 0.20 + boosters).
 */
const mapRiskToSeverity = (riskScore) => {
  // Thresholds aligned with the risk model's own definitions:
  //   is_critical >= 0.80, is_high_risk >= 0.50
  // Previously 0.60 = critical caused Gemini scores of 0.60-0.79
  // (which the model considers "high risk, not critical") to all map
  // to "critical", producing systematic overclassification.
  if (riskScore >= 0.78) return 'critical';
  if (riskScore >= 0.50) return 'high';
  if (riskScore >= 0.28) return 'medium';
  return 'low';
};

const emitLeiAlertIfNeeded = (incident) => {
  if (!incident || !['high', 'critical'].includes(incident.severity)) {
    return;
  }

  emitToRoles(['law_enforcement', 'admin'], 'lei_alert', {
    incidentId: incident.incident_id,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    incidentDate: incident.incident_date,
    latitude: incident.latitude,
    longitude: incident.longitude,
    locationName: incident.location_name || null,
  });
};

const normalizeText = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);

const toTokenSet = (text) => new Set(normalizeText(text));

const jaccardSimilarity = (setA, setB) => {
  if (!setA.size && !setB.size) {
    return 0;
  }

  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) {
      intersection += 1;
    }
  });

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

/**
 * Compute cosine similarity between a query vector and each candidate vector.
 * Returns a score per candidate in the same order as candidateVecs.
 * Stored embeddings come from the DB as FLOAT4[] (plain JS arrays).
 */
const cosineSimilarityBatch = (queryVec, candidateVecs) => {
  const qArr = Array.isArray(queryVec) ? queryVec : Array.from(queryVec);
  let qNorm = 0;
  for (let i = 0; i < qArr.length; i++) qNorm += qArr[i] * qArr[i];
  qNorm = Math.sqrt(qNorm);
  if (qNorm === 0) return candidateVecs.map(() => 0);

  return candidateVecs.map((vec) => {
    const cArr = Array.isArray(vec) ? vec : Array.from(vec);
    let dot = 0;
    let cNorm = 0;
    for (let i = 0; i < cArr.length; i++) {
      dot += qArr[i] * cArr[i];
      cNorm += cArr[i] * cArr[i];
    }
    cNorm = Math.sqrt(cNorm);
    return cNorm === 0 ? 0 : dot / (qNorm * cNorm);
  });
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeEntityToken = (token) => {
  const cleaned = (token || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleaned) {
    return null;
  }
  return STREET_SUFFIX_MAP[cleaned] || cleaned;
};

const extractEntityTokens = (text) => {
  const rawTokens = (text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const entities = new Set();

  rawTokens.forEach((rawToken, index) => {
    const token = normalizeEntityToken(rawToken);
    if (!token) {
      return;
    }

    const nextToken = normalizeEntityToken(rawTokens[index + 1]);
    const nextNextToken = normalizeEntityToken(rawTokens[index + 2]);

    // Capture "main st" and "main street" style references consistently.
    if (
      token.length >= 3
      && nextToken
      && NORMALIZED_STREET_SUFFIXES.has(nextToken)
      && !DEDUP_ENTITY_STOPWORDS.has(token)
    ) {
      entities.add(`${token}_${nextToken}`);
    }

    // Capture simple address forms like "123 main st".
    if (/^\d+$/.test(token) && nextToken && nextNextToken && NORMALIZED_STREET_SUFFIXES.has(nextNextToken)) {
      entities.add(`${token}_${nextToken}_${nextNextToken}`);
      entities.add(`${nextToken}_${nextNextToken}`);
    }

    if (token.length >= 4 && !DEDUP_ENTITY_STOPWORDS.has(token)) {
      entities.add(token);
    }
  });

  return entities;
};

const getSharedKeywordSignals = (baseEntityTokens, candidateEntityTokens, max = 8) => {
  const shared = [...baseEntityTokens]
    .filter((token) => candidateEntityTokens.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .sort((a, b) => b.length - a.length)
    .slice(0, max)
    .map((token) => token.replace(/_/g, ' '));

  return shared;
};

const countKeywordMatches = (text, keywords) => {
  const lowered = (text || '').toLowerCase();
  return keywords.reduce((count, keyword) => {
    return lowered.includes(keyword) ? count + 1 : count;
  }, 0);
};

const predictCategory = (title, description) => {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const scores = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => ({
    category,
    score: countKeywordMatches(text, keywords),
  }));

  const best = scores.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score === 0) {
    return { predictedCategory: null, confidence: 0 };
  }

  const confidence = clamp(0.4 + best.score * 0.1, 0, 0.95);
  return { predictedCategory: best.category, confidence };
};

const assessToxicity = (text) => {
  const tokens = (text || '').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { score: 0, isToxic: false };
  }

  const profaneCount = tokens.reduce((count, token) => {
    return profanityFilter.isProfane(token) ? count + 1 : count;
  }, 0);

  const score = clamp(profaneCount / tokens.length, 0, 1);
  return { score, isToxic: score >= LIMITS.ML.TOXICITY_THRESHOLD };
};

const computeRiskScore = ({ severity, category, text, highConfidenceDuplicates }) => {
  const baseMap = {
    low: 0.2,
    medium: 0.4,
    high: 0.7,
    critical: 0.9,
  };

  const baseScore = baseMap[severity] ?? 0.4;
  const lowered = (text || '').toLowerCase();
  const keywordHits = countKeywordMatches(text, HIGH_RISK_KEYWORDS);
  const urgentHits = countKeywordMatches(text, URGENT_CONTEXT_KEYWORDS);
  const deescalationHits = countKeywordMatches(text, DEESCALATION_PHRASES);
  const keywordBoost = Math.min(0.3, keywordHits * 0.05);
  const urgentBoost = Math.min(0.15, urgentHits * 0.04);
  const duplicateBoost = Math.min(0.2, (highConfidenceDuplicates || 0) * 0.05);
  const categoryBoost = ['fire', 'assault', 'medical_emergency'].includes(category) ? 0.1 : 0;
  const deescalationPenalty = Math.min(0.12, deescalationHits * 0.06);
  const toxicityLanguageBoost = (lowered.includes('kill') || lowered.includes('die')) ? 0.04 : 0;

  return clamp(
    baseScore
      + keywordBoost
      + urgentBoost
      + duplicateBoost
      + categoryBoost
      + toxicityLanguageBoost
      - deescalationPenalty,
    0,
    1
  );
};

const computeDedupScore = ({
  textSimilarity,
  entitySimilarity,
  distanceMeters,
  timeHours,
  categoryMatch,
  bothCategoriesOther,
  sameReporter,
}) => {
  const distanceScore = clamp(1 - distanceMeters / LIMITS.DEDUP.RADIUS_METERS, 0, 1);
  const timeScore = clamp(1 - timeHours / LIMITS.DEDUP.TIME_HOURS, 0, 1);
  const extremeProximityBoost = (distanceMeters < 50 && timeHours < 0.5) ? 0.15 : 0;
  // Both being 'other' is a catch-all match, not a meaningful category signal.
  // Give partial credit (0.3) instead of full (1.0) to avoid false positives.
  const categoryScore = categoryMatch ? (bothCategoriesOther ? 0.3 : 1) : 0;
  const sameReporterScore = sameReporter ? 1 : 0;

  const score =
    0.35 * textSimilarity +
    0.1 * entitySimilarity +
    0.2 * distanceScore +
    0.2 * timeScore +
    0.1 * categoryScore +
    0.05 * sameReporterScore +
    extremeProximityBoost;

  return clamp(score, 0, 1);
};

const buildDedupCandidates = (incident, candidates) => {
  const baseText = `${incident.title} ${incident.description}`;
  const baseTokens = toTokenSet(baseText);
  const baseEntityTokens = extractEntityTokens(baseText);
  const incidentDate = new Date(incident.incident_date);

  return candidates
    .map((candidate) => {
      const candidateText = `${candidate.title} ${candidate.description}`;
      const candidateTokens = toTokenSet(candidateText);
      const candidateEntityTokens = extractEntityTokens(candidateText);
      const textSimilarity = jaccardSimilarity(baseTokens, candidateTokens);
      const entitySimilarity = jaccardSimilarity(baseEntityTokens, candidateEntityTokens);
      const sharedKeywords = getSharedKeywordSignals(baseEntityTokens, candidateEntityTokens);
      const distanceMeters = Math.max(0, parseFloat(candidate.distance_meters || 0));
      const timeHours = Math.abs(incidentDate - new Date(candidate.incident_date)) / 36e5;
      const categoryMatch = incident.category === candidate.category;
      const bothCategoriesOther = categoryMatch && incident.category === 'other';
      const sameReporter = incident.reporter_id === candidate.reporter_id;
      const canonicalIncidentId = candidate.canonical_incident_id || candidate.incident_id;
      const canonicalTitle = candidate.canonical_title || candidate.title;
      const score = computeDedupScore({
        textSimilarity,
        entitySimilarity,
        distanceMeters,
        timeHours,
        categoryMatch,
        bothCategoriesOther,
        sameReporter,
      });

      return {
        incidentId: candidate.incident_id,
        title: candidate.title,
        description: candidate.description,
        category: candidate.category || null,
        canonicalIncidentId,
        canonicalTitle,
        canonicalReportId: candidate.canonical_report_id || null,
        matchedIncidentId: candidate.incident_id,
        matchedViaMergedDuplicate: Boolean(candidate.canonical_incident_id),
        latitude: Number.isFinite(Number(candidate.latitude)) ? Number(candidate.latitude) : null,
        longitude: Number.isFinite(Number(candidate.longitude)) ? Number(candidate.longitude) : null,
        score: Number(score.toFixed(3)),
        distanceMeters: Math.round(distanceMeters),
        timeHours: Number(timeHours.toFixed(2)),
        textSimilarity: Number(textSimilarity.toFixed(3)),
        namedEntitySimilarity: Number(entitySimilarity.toFixed(3)),
        sharedKeywords,
        categoryMatch,
        sameReporter,
        mlSimilarity: null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMITS.DEDUP.MAX_CANDIDATES);
};

async function applyAutoVerificationIfEligible(incident, context = {}) {
  if (!incident || incident.is_draft) {
    return { autoVerified: false, reason: 'draft_or_missing' };
  }

  if (incident.status !== 'submitted') {
    return { autoVerified: false, reason: 'not_submitted' };
  }

  const confidencePercent = Number(context.confidencePercent);
  if (!Number.isFinite(confidencePercent)) {
    return { autoVerified: false, reason: 'no_confidence' };
  }

  if (context.isToxic) {
    return { autoVerified: false, reason: 'toxic' };
  }

  if ((context.highConfidenceDuplicates || 0) > 0) {
    return { autoVerified: false, reason: 'possible_duplicate' };
  }

  const policy = await settingsService.getAutoVerificationPolicy();
  if (!policy.enabled || confidencePercent < policy.minConfidenceScore) {
    return { autoVerified: false, reason: 'policy_threshold' };
  }

  const updated = await db.one(
    `UPDATE incidents
     SET status = 'verified',
         ${getLifecycleTimestampUpdate("'verified'")}
         updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [incident.incident_id]
  );

  incident.status = updated.status;

  await logAction(
    incident.incident_id,
    null,
    'verified',
    `Auto-verified at ${confidencePercent}% confidence (threshold ${policy.minConfidenceScore}%)`
  );

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updated.incident_id,
    status: updated.status,
    severity: updated.severity,
  });

  emitLeiAlertIfNeeded(updated);

  await notificationService.notifyStaffIncidentEvent('incident:auto_verified', updated, {
    confidencePercent,
    threshold: policy.minConfidenceScore,
  });

  await notifyReporterStatusUpdate(updated, {
    previousStatus: 'submitted',
    nextStatus: updated.status,
  }, 'auto verification');

  return {
    autoVerified: true,
    confidencePercent,
    threshold: policy.minConfidenceScore,
  };
}

/**
 * Create a new incident
 * @param {Object} incidentData - The incident data
 * @param {number} reporterId - The ID of the user creating the incident
 * @returns {Promise<Object>} The created incident
 */
async function createIncident(incidentData, reporterId, options = {}) {
  const startedAt = Date.now();
  logger.info(
    `Create incident started: reporterId=${reporterId} photoUrls=${Array.isArray(incidentData.photoUrls) ? incidentData.photoUrls.length : 0} hasVideoUrl=${Boolean(incidentData.videoUrl)} isDraft=${incidentData.isDraft} hasIdempotencyKey=${Boolean(options.idempotencyKey || incidentData.idempotencyKey)}`
  );

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
    videoUrl,
    enableMlClassification,
    enableMlRisk,
  } = incidentData;
  const normalizedIsAnonymous = normalizeBoolean(isAnonymous);
  const normalizedIsDraft = normalizeBoolean(isDraft);
  const normalizedEnableMlClassification =
    enableMlClassification === undefined ? true : normalizeBoolean(enableMlClassification);
  const normalizedEnableMlRisk =
    enableMlRisk === undefined ? true : normalizeBoolean(enableMlRisk);

  const normalizedIdempotencyKey = !normalizedIsDraft
    ? normalizeIdempotencyKey(options.idempotencyKey || incidentData.idempotencyKey)
    : null;
  const idempotencyPayloadHash = normalizedIdempotencyKey
    ? buildIncidentPayloadHash(incidentData, reporterId)
    : null;

  logger.info(
    `Create incident normalized: reporterId=${reporterId} isDraft=${normalizedIsDraft} enableMlClassification=${normalizedEnableMlClassification} enableMlRisk=${normalizedEnableMlRisk} photoUrls=${Array.isArray(photoUrls) ? photoUrls.length : 0} hasVideoUrl=${Boolean(videoUrl)}`
  );

  const insertParams = [
    reporterId,
    title,
    description,
    category,
    latitude,
    longitude,
    locationName || null,
    incidentDate || new Date(),
    severity,
    normalizedIsAnonymous,
    normalizedIsDraft,
    photoUrls || null,
    videoUrl || null,
    normalizedIsDraft ? 'draft' : 'submitted',
  ];

  let incident;

  if (normalizedIdempotencyKey) {
    logger.info(`Create incident inserting with idempotency: reporterId=${reporterId}`);
    incident = await db.oneOrNone(
      `INSERT INTO incidents (
        reporter_id, title, description, category, latitude, longitude,
        location, location_name, incident_date, severity, is_anonymous, is_draft,
        photo_urls, video_url, status, idempotency_key, idempotency_payload_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326)::geography,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (reporter_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL
        DO NOTHING
      RETURNING *`,
      [...insertParams, normalizedIdempotencyKey, idempotencyPayloadHash]
    );

    if (!incident) {
      const existingIncident = await db.oneOrNone(
        `SELECT *
         FROM incidents
         WHERE reporter_id = $1
           AND idempotency_key = $2`,
        [reporterId, normalizedIdempotencyKey]
      );

      if (!existingIncident) {
        throw ServiceError.conflict('Incident submission is already being processed');
      }

      if (existingIncident.idempotency_payload_hash !== idempotencyPayloadHash) {
        throw ServiceError.conflict('Idempotency key was already used for a different incident payload');
      }

      logger.info(
        `Create incident reused idempotent result: incidentId=${existingIncident.incident_id} elapsedMs=${Date.now() - startedAt}`
      );
      return stripIncidentIdempotencyFields(existingIncident);
    }
  } else {
    logger.info(`Create incident inserting without idempotency: reporterId=${reporterId}`);
    incident = await db.one(
      `INSERT INTO incidents (
        reporter_id, title, description, category, latitude, longitude,
        location, location_name, incident_date, severity, is_anonymous, is_draft, photo_urls, video_url, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326)::geography,
        $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *`,
      insertParams
    );
  }

  logger.info(
    `Create incident inserted: incidentId=${incident.incident_id} status=${incident.status} photoCount=${incident.photo_urls?.length || 0} hasVideoUrl=${Boolean(incident.video_url)} elapsedMs=${Date.now() - startedAt}`
  );

  const autoVerificationContext = {
    confidencePercent: null,
    highConfidenceDuplicates: 0,
    isToxic: false,
  };

  if (!incident.is_draft) {
    logger.info(`Create incident scheduling post-processing: incidentId=${incident.incident_id}`);
    (async () => {
    const postProcessStartedAt = Date.now();
    logger.info(`Incident post-processing started: incidentId=${incident.incident_id}`);
    try {
      const latitudeValue = parseFloat(incident.latitude);
      const longitudeValue = parseFloat(incident.longitude);
      const mlText = `${incident.title} ${incident.description}`;
      const allowMlClassification = normalizedEnableMlClassification;
      const allowMlRisk = normalizedEnableMlRisk;
      const allowExternalMl = allowMlClassification || allowMlRisk;

      // Fetch dedup candidates before the ML call so candidate texts can be
      // bundled into a single analyzeIncident round-trip (no separate /similarity call).
      let candidates = [];
      if (!Number.isNaN(latitudeValue) && !Number.isNaN(longitudeValue)) {
        const candidateQuery = `
          SELECT
            i.incident_id,
            i.title,
            i.description,
            i.latitude,
            i.longitude,
            i.category,
            i.incident_date,
            i.reporter_id,
            i.text_embedding,
            duplicate_parent.incident_id AS canonical_incident_id,
            duplicate_parent.title AS canonical_title,
            duplicate_parent.report_id AS canonical_report_id,
            ST_Distance(
              i.location,
              ST_SetSRID(ST_MakePoint($1::float, $2::float), 4326)::geography
            ) AS distance_meters
          FROM incidents i
          LEFT JOIN LATERAL (
            WITH RECURSIVE parent_chain(report_id, depth, path) AS (
              SELECT rl.canonical_report_id, 1, ARRAY[dr.report_id, rl.canonical_report_id]
              FROM reports dr
              JOIN report_links rl ON rl.duplicate_report_id = dr.report_id
                AND rl.link_type = 'duplicate'
              WHERE dr.incident_id = i.incident_id
              UNION ALL
              SELECT rl.canonical_report_id, pc.depth + 1, pc.path || rl.canonical_report_id
              FROM parent_chain pc
              JOIN report_links rl ON rl.duplicate_report_id = pc.report_id
                AND rl.link_type = 'duplicate'
              WHERE pc.depth < 20
                AND NOT rl.canonical_report_id = ANY(pc.path)
            )
            SELECT ci.incident_id, ci.title, cr.report_id
            FROM parent_chain pc
            JOIN reports cr ON cr.report_id = pc.report_id
            JOIN incidents ci ON ci.incident_id = cr.incident_id
            ORDER BY pc.depth DESC
            LIMIT 1
          ) duplicate_parent ON TRUE
          WHERE i.is_draft = FALSE
            AND i.incident_id <> $3
            AND i.location IS NOT NULL
            AND i.incident_date BETWEEN
              $4::timestamp - INTERVAL '${LIMITS.DEDUP.TIME_HOURS} hours'
              AND $4::timestamp + INTERVAL '${LIMITS.DEDUP.TIME_HOURS} hours'
            AND ST_DWithin(
              i.location,
              ST_SetSRID(ST_MakePoint($1::float, $2::float), 4326)::geography,
              $5
            )
          ORDER BY i.incident_date DESC
          LIMIT $6
        `;
        candidates = await db.manyOrNone(candidateQuery, [
          longitudeValue,
          latitudeValue,
          incident.incident_id,
          incident.incident_date,
          LIMITS.DEDUP.RADIUS_METERS,
          LIMITS.DEDUP.MAX_CANDIDATES,
        ]);
      }

      // ── ML call strategy based on stored embedding availability ─────────
      // Fast path  (all candidates have stored embeddings):
      //   /analyze handles classification + toxicity + risk only.
      //   /embed runs concurrently to get the query vector.
      //   Cosine similarity is then computed in-process — zero extra ML calls.
      //
      // Transition path (some/all candidates lack stored embeddings):
      //   Bundle candidateTexts into /analyze (one call covers everything).
      const allCandidatesHaveEmbedding = candidates.length > 0
        && candidates.every((c) => Array.isArray(c.text_embedding) && c.text_embedding.length > 0);

      // Try external ML service first, fallback to heuristics.
      let mlResults = null;
      let queryEmbedding = null;
      let useExternalMl = false;
      if (allowExternalMl) {
        try {
          if (allCandidatesHaveEmbedding) {
            // Fast path: run analyze and embed concurrently.
            // Both are independent Gemini requests; FastAPI semaphore (GEMINI_MAX_CONCURRENCY=20)
            // lets them run in parallel, so total latency ≈ max(analyze, embed).
            [mlResults, queryEmbedding] = await Promise.all([
              mlClient.analyzeIncident({
                text: mlText,
                category: incident.category,
                severity: incident.severity,
                candidateTexts: null,
                duplicateCount: 0,
              }),
              mlClient.getEmbedding(mlText),
            ]);
          } else {
            // Transition path: bundle candidate texts so /analyze returns similarity scores.
            const candidateTexts = candidates.length > 0
              ? candidates.map((c) => `${c.title} ${c.description}`)
              : null;
            mlResults = await mlClient.analyzeIncident({
              text: mlText,
              category: incident.category,
              severity: incident.severity,
              candidateTexts,
              duplicateCount: 0,
            });
          }
          useExternalMl = mlResults !== null;
          if (useExternalMl) {
            logger.info(
              `ML applied to incident ${incident.incident_id} ` +
              `(stored embeddings: ${allCandidatesHaveEmbedding})`
            );
          }
        } catch (mlError) {
          logger.warn(`External ML service unavailable, using heuristics: ${mlError.message}`);
        }
      }

      // Extract ML results or fallback to heuristics
      const { predictedCategory, confidence: categoryConfidence } = allowMlClassification
        ? (useExternalMl && mlResults?.classification
          ? { predictedCategory: mlResults.classification.predictedCategory, confidence: mlResults.classification.confidence }
          : predictCategory(incident.title, incident.description))
        : { predictedCategory: null, confidence: null };

      const toxicity = useExternalMl && mlResults?.toxicity
        ? { score: mlResults.toxicity.toxicityScore, isToxic: mlResults.toxicity.isToxic }
        : assessToxicity(mlText);

      // Only trust ML-sourced confidence for auto-verification.
      // Heuristic keyword matching can produce false high-confidence scores
      // (it starts at 40% for any single keyword hit).
      // If the external ML service was unavailable, leave confidencePercent null
      // so applyAutoVerificationIfEligible returns reason='no_confidence'.
      autoVerificationContext.confidencePercent =
        useExternalMl && mlResults?.classification
          ? Number((Number(categoryConfidence) * 100).toFixed(2))
          : null;
      autoVerificationContext.isToxic = Boolean(toxicity.isToxic);

      if (!Number.isNaN(latitudeValue) && !Number.isNaN(longitudeValue)) {
        const report = await db.one(
          `INSERT INTO reports (incident_id, photo_urls, video_url, metadata, ml_confidence_score)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING report_id`,
          [
            incident.incident_id,
            incident.photo_urls || null,
            incident.video_url || null,
            { source: 'incident' },
            categoryConfidence === null || categoryConfidence === undefined
              ? null
              : Number(categoryConfidence.toFixed(2)),
          ]
        );

        logger.info(
          `Incident report row created: incidentId=${incident.incident_id} reportId=${report.report_id} hasVideoUrl=${Boolean(incident.video_url)}`
        );

        // Use ML-predicted category for dedup matching instead of the
        // frontend placeholder ('other') that hasn't been updated yet.
        const dedupIncident = predictedCategory
          ? { ...incident, category: predictedCategory }
          : incident;

        // Compute dedup with optional ML-enhanced similarity
        let scoredCandidates = buildDedupCandidates(dedupIncident, candidates);

        // ── ML semantic similarity — two paths ─────────────────────────
        //
        // Fast path  (all candidates had stored embeddings):
        //   queryEmbedding was fetched concurrently; compute cosine in-process.
        //   No additional ML calls needed.
        //
        // Transition path (some/all candidates lacked stored embeddings):
        //   Scores come from the bundled /analyze response.
        let similarityByIncidentId = new Map();

        if (useExternalMl && allCandidatesHaveEmbedding && queryEmbedding) {
          const scores = cosineSimilarityBatch(
            queryEmbedding,
            candidates.map((c) => c.text_embedding)
          );
          similarityByIncidentId = new Map(
            candidates.map((c, idx) => [c.incident_id, { score: scores[idx] }])
          );
        } else {
          const mlSimilarities = mlResults?.similarity?.similarities;
          if (useExternalMl && mlSimilarities?.length > 0) {
            similarityByIncidentId = new Map(
              mlSimilarities
                .filter((s) => Number.isInteger(s.index) && s.index >= 0 && s.index < candidates.length)
                .map((s) => [candidates[s.index].incident_id, s])
            );
          }
        }

        if (useExternalMl && similarityByIncidentId.size > 0) {
          try {
            scoredCandidates = scoredCandidates.map((candidate) => {
              const mlSim = similarityByIncidentId.get(candidate.incidentId);
              if (mlSim && Number.isFinite(mlSim.score)) {
                // Blend ML and Jaccard similarity (90% ML, 10% Jaccard).
                // Jaccard fails on paraphrased text (different words, same meaning)
                // so ML must dominate when available.
                const blendedTextSim = 0.9 * mlSim.score + 0.1 * candidate.textSimilarity;
                const newScore = computeDedupScore({
                  textSimilarity: blendedTextSim,
                  entitySimilarity: candidate.namedEntitySimilarity,
                  distanceMeters: candidate.distanceMeters,
                  timeHours: candidate.timeHours,
                  categoryMatch: candidate.categoryMatch,
                  bothCategoriesOther: candidate.categoryMatch
                    && dedupIncident.category === 'other',
                  sameReporter: candidate.sameReporter,
                });
                return {
                  ...candidate,
                  textSimilarity: Number(blendedTextSim.toFixed(3)),
                  mlSimilarity: Number(mlSim.score.toFixed(3)),
                  score: Number(newScore.toFixed(3)),
                };
              }
              return candidate;
            }).sort((a, b) => b.score - a.score);
          } catch (simError) {
            logger.warn(`ML similarity enhancement failed: ${simError.message}`);
          }
        }

        // ── Stage-2: LLM contextual pairwise comparison ────────────────
        // Stage-1 scores are computed from numeric signals (distance, time,
        // text/semantic similarity, entities).  Stage-2 reads BOTH report texts
        // in full and asks Gemini: "Are these the same real-world event?"
        //
        // This catches cases stage-1 misses:
        //   • Heavily paraphrased descriptions (text similarity near 0 despite
        //     being the same event).
        //   • Different locations mentioned due to different vantage points.
        //   • Reporter A says "gun shots" while Reporter B says "armed robbery".
        //
        // Gate: only candidates with stage-1 score >= 0.35 are sent — filters
        // obvious noise and limits the number of LLM calls per submission.
        //
        // All comparisons are fired in parallel so total added latency ≈
        // max(single call) rather than N × call.
        //
        // Override logic (only applied when LLM confidence >= 0.70):
        //   is_duplicate: true  → final score = 0.80 + (confidence - 0.70) × 0.5
        //   is_duplicate: false → final score capped at min(stage-1, 0.55)
        // When LLM is uncertain (< 0.70) the stage-1 score is preserved.

        const STAGE2_GATE = 0.35;
        // Minimum Jaccard text similarity required to enter stage-2.
        // Purely location/time-driven pairs (near-zero text overlap) are not
        // sent to the LLM — it only sees text and would have no signal to
        // distinguish two unrelated nearby incidents.
        const STAGE2_MIN_TEXT_SIM = 0.08;
        const STAGE2_CONFIDENCE_FLOOR = 0.70;
        const STAGE2_MAX_CALLS = 3; // cap LLM calls per submission

        const stage2Candidates = useExternalMl
          ? scoredCandidates
              .filter((c) => c.score >= STAGE2_GATE && c.textSimilarity >= STAGE2_MIN_TEXT_SIM)
              .slice(0, STAGE2_MAX_CALLS) // already sorted by score desc
          : [];

        if (stage2Candidates.length > 0) {
          try {
            const verdictResults = await Promise.allSettled(
              stage2Candidates.map((c) =>
                mlClient.dedupCompare(mlText, `${c.title} ${c.description}`, {
                  baseCategory: incident.category,
                  candidateCategory: c.category,
                  timeHours: c.timeHours,
                  distanceMeters: c.distanceMeters,
                })
              )
            );

            const verdictMap = new Map();
            verdictResults.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value !== null) {
                verdictMap.set(stage2Candidates[index].incidentId, result.value);
              }
            });

            if (verdictMap.size > 0) {
              scoredCandidates = scoredCandidates.map((candidate) => {
                const verdict = verdictMap.get(candidate.incidentId);
                if (!verdict) return candidate;

                const { isDuplicate, confidence, reasoning } = verdict;
                const llmVerdict = { isDuplicate, confidence, reasoning, overrode: false };

                if (confidence < STAGE2_CONFIDENCE_FLOOR) {
                  // LLM is uncertain — keep stage-1 score, just record the reasoning.
                  return { ...candidate, llmVerdict };
                }

                // LLM is confident — override the composite score.
                let overriddenScore;
                if (isDuplicate) {
                  // Scale 0.80 → 0.95 based on LLM confidence above the floor.
                  overriddenScore = 0.80 + (confidence - STAGE2_CONFIDENCE_FLOOR) * 0.5;
                } else {
                  // Confirmed distinct — cap below the highConfidenceDuplicates threshold.
                  overriddenScore = Math.min(candidate.score, 0.55);
                }

                return {
                  ...candidate,
                  score: Number(Math.min(overriddenScore, 1.0).toFixed(3)),
                  llmVerdict: { ...llmVerdict, overrode: true },
                };
              }).sort((a, b) => b.score - a.score);

              const overriddenCount = scoredCandidates.filter(
                (c) => c.llmVerdict?.overrode
              ).length;
              logger.info(
                `Stage-2 LLM compare: ${verdictMap.size} comparisons, ` +
                `${overriddenCount} score overrides on incident ${incident.incident_id}`
              );
            }
          } catch (stage2Error) {
            logger.warn(`Stage-2 pairwise compare failed: ${stage2Error.message}`);
          }
        }

        const topScore = scoredCandidates[0]?.score || 0;
        // 0.70 calibrated against test data: SAME-report pairs score ~0.80+,
        // DIFF-report pairs score ~0.56–0.57. 0.55 caused false positives that
        // blocked auto-verification for legitimately distinct incidents.
        const highConfidenceDuplicates = scoredCandidates.filter((candidate) => candidate.score >= 0.70).length;
        autoVerificationContext.highConfidenceDuplicates = highConfidenceDuplicates;

        // Risk scoring: prefer ML if available
        const riskScore = allowMlRisk
          ? (useExternalMl && mlResults?.risk
            ? mlResults.risk.riskScore
            : computeRiskScore({
                severity: incident.severity,
                category: incident.category,
                text: mlText,
                highConfidenceDuplicates,
              }))
          : null;

        await db.none(
          `INSERT INTO report_ml (
            report_id,
            predicted_category,
            confidence,
            dedup_candidates,
            risk_score,
            toxicity_score,
            is_toxic
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            report.report_id,
            predictedCategory,
            categoryConfidence === null || categoryConfidence === undefined
              ? null
              : Number(categoryConfidence.toFixed(2)),
            {
              generatedAt: new Date().toISOString(),
              radiusMeters: LIMITS.DEDUP.RADIUS_METERS,
              timeHours: LIMITS.DEDUP.TIME_HOURS,
              topScore: Number(topScore.toFixed(2)),
              candidates: scoredCandidates,
              mlEnhanced: useExternalMl,
              mlCandidatesWithSimilarity: scoredCandidates
                .filter((candidate) => Number.isFinite(candidate.mlSimilarity))
                .length,
              sourceIncident: {
                incidentId: incident.incident_id,
                title: incident.title,
                description: incident.description,
                latitude: incident.latitude,
                longitude: incident.longitude,
              },
            },
            riskScore === null || riskScore === undefined
              ? null
              : Number(riskScore.toFixed(2)),
            Number(toxicity.score.toFixed(2)),
            toxicity.isToxic,
          ]
        );

        // ── Apply ML predictions back to the incident ──────────────────
        // When ML classification/risk is enabled, the frontend sends placeholder
        // defaults (category='other', severity='medium') since those pickers are
        // hidden.  We now overwrite them with the ML-derived values.

        const mlCategory = allowMlClassification && predictedCategory
          && VALID_CATEGORIES.includes(predictedCategory)
          ? predictedCategory
          : null;

        const mlSeverity = allowMlRisk && riskScore !== null
          ? mapRiskToSeverity(riskScore)
          : null;

        if (mlCategory || mlSeverity) {
          const updatedFields = await db.one(
            `UPDATE incidents
             SET category  = COALESCE($2, category),
                 severity  = COALESCE($3, severity),
                 updated_at = CURRENT_TIMESTAMP
             WHERE incident_id = $1
             RETURNING category, severity`,
            [incident.incident_id, mlCategory, mlSeverity]
          );
          incident.category = updatedFields.category;
          incident.severity = updatedFields.severity;
          logger.info(
            `ML applied to incident ${incident.incident_id}: ` +
            `category=${mlCategory || '(unchanged)'}, severity=${mlSeverity || '(unchanged)'}`
          );
        }

        // High-confidence duplicates are surfaced as suggestions only — they are stored
        // in dedup_candidates and shown in the report's "Potential Duplicates" panel for
        // a moderator to merge manually (linkDuplicateIncident). We deliberately do NOT
        // auto-create the duplicate link or flip the status here; merging is a human
        // decision. highConfidenceDuplicates still feeds the risk score and the
        // "don't auto-verify a likely duplicate" guard above.

        mediaJudgmentService.queueIncidentMediaAnalysis(incident.incident_id);

        // ── Auto-flag for toxicity / extreme risk ──────────────────────
        const shouldAutoFlag =
          toxicity.isToxic ||
          (allowMlRisk && riskScore !== null && riskScore >= LIMITS.ML.RISK_AUTOFLAG);
        if (shouldAutoFlag) {
          const newSeverity =
            allowMlRisk && riskScore !== null && riskScore >= LIMITS.ML.RISK_AUTOFLAG
              ? 'critical'
              : incident.severity;
          const updatedIncident = await db.one(
            `UPDATE incidents
             SET status = 'auto_flagged',
                 severity = $2,
                 ${getLifecycleTimestampUpdate("'auto_flagged'")}
                 updated_at = CURRENT_TIMESTAMP
             WHERE incident_id = $1
             RETURNING *`,
            [incident.incident_id, newSeverity]
          );

          incident.status = updatedIncident.status;
          incident.severity = updatedIncident.severity;

          await logAction(
            incident.incident_id,
            null,
            'flagged',
            toxicity.isToxic
              ? 'Auto-flagged due to toxicity'
              : 'Auto-flagged due to high risk score'
          );

          emitToRoles(['moderator', 'admin', 'law_enforcement'], 'incident:update', {
            incidentId: updatedIncident.incident_id,
            status: updatedIncident.status,
            severity: updatedIncident.severity,
          });
        }
        // ── Store new incident's embedding for future dedup reuse ──────
        // Persisted so future submissions can compute cosine similarity
        // in-process without re-embedding this incident's text.
        //
        // If the fast path was used, queryEmbedding is already available.
        // Otherwise, fetch it asynchronously (does not block the response).
        const embeddingToStore = queryEmbedding || null;
        if (embeddingToStore) {
          db.none(
            'UPDATE incidents SET text_embedding = $1 WHERE incident_id = $2',
            [embeddingToStore, incident.incident_id]
          ).catch((e) => logger.warn(`Failed to store incident embedding: ${e.message}`));
        } else if (useExternalMl) {
          mlClient.getEmbedding(mlText)
            .then((emb) => {
              if (!emb) return;
              return db.none(
                'UPDATE incidents SET text_embedding = $1 WHERE incident_id = $2',
                [emb, incident.incident_id]
              );
            })
            .catch((e) => logger.warn(`Failed to store incident embedding async: ${e.message}`));
        }

      }
    } catch (error) {
      logger.warn(`Dedup/ML processing failed for incident ${incident.incident_id}: ${error.message}`);
    }

    try {
      await applyAutoVerificationIfEligible(incident, autoVerificationContext);
    } catch (error) {
      logger.warn(`Auto-verification failed for incident ${incident.incident_id}: ${error.message}`);
    }

    emitToRoles(['moderator', 'admin'], 'incident:new', {
      incidentId: incident.incident_id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      incidentDate: incident.incident_date,
    });

    try {
      await notificationService.notifyStaffIncidentEvent('incident:new', incident);
    } catch (error) {
      logger.warn(`Staff notification failed for incident ${incident.incident_id}: ${error.message}`);
    }

    // Witness constellations are no longer opened automatically; a moderator
    // activates them per report from the dashboard.
    logger.info(
      `Incident post-processing finished main steps: incidentId=${incident.incident_id} elapsedMs=${Date.now() - postProcessStartedAt}`
    );
    })().catch((error) => {
      logger.error(`Post-processing failed for incident ${incident.incident_id}: ${error.message}`);
    });
  }

  logger.info(
    `Create incident returning response: incidentId=${incident.incident_id} elapsedMs=${Date.now() - startedAt}`
  );
  return stripIncidentIdempotencyFields(incident);
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
const stripReporterIdentity = (incident) => {
  const clone = { ...incident };
  delete clone.reporter_id;
  delete clone.username;
  delete clone.email;
  return clone;
};

async function getAllIncidents(filters = {}) {
  const {
    category,
    status,
    severity,
    limit = 50,
    offset = 0,
    includeConstellation = false,
    userRole = null,
  } = filters;
  const includeStaffConstellation = shouldIncludeStaffConstellation(
    includeConstellation,
    userRole
  );
  const isStaff = STAFF_ROLES.has(userRole);

  let query = `
    SELECT i.*, u.username, u.email
      ${includeStaffConstellation ? staffConstellationSelect('c') : ''}
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
    ${includeStaffConstellation ? staffConstellationJoin('i') : ''}
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
    // Support comma-separated list of statuses (e.g. "submitted,auto_flagged,auto_processed")
    const statuses = String(status).split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      query += ` AND i.status = $${paramCount}`;
      params.push(statuses[0]);
      paramCount += 1;
    } else {
      const placeholders = statuses.map((_, i) => `$${paramCount + i}`).join(', ');
      query += ` AND i.status IN (${placeholders})`;
      params.push(...statuses);
      paramCount += statuses.length;
    }
  } else {
    query += ` AND i.status <> 'merged'`;
  }

  if (severity) {
    query += ` AND i.severity = $${paramCount}`;
    params.push(severity);
    paramCount++;
  }

  query += ` ORDER BY i.incident_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const incidents = await db.manyOrNone(query, params);
  const formatted = includeStaffConstellation
    ? incidents.map(formatIncidentWithStaffConstellation)
    : incidents;

  // Citizens never receive reporter identity (username/email/reporter_id): this keeps
  // anonymous reports anonymous to the public and avoids leaking PII on this endpoint.
  // Staff keep full visibility.
  return isStaff ? formatted : formatted.map(stripReporterIdentity);
}

async function countIncidents(filters = {}) {
  const { category, status, severity } = filters;
  let query = `
    SELECT COUNT(*) AS total
    FROM incidents i
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
    const statuses = String(status).split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      query += ` AND i.status = $${paramCount}`;
      params.push(statuses[0]);
      paramCount += 1;
    } else if (statuses.length > 1) {
      const placeholders = statuses.map((_, i) => `$${paramCount + i}`).join(', ');
      query += ` AND i.status IN (${placeholders})`;
      params.push(...statuses);
      paramCount += statuses.length;
    }
  } else {
    query += ` AND i.status <> 'merged'`;
  }

  if (severity) {
    query += ` AND i.severity = $${paramCount}`;
    params.push(severity);
  }

  const result = await db.one(query, params);
  return parseInt(result.total || 0, 10);
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
      i.created_at, i.incident_date, i.photo_urls, i.video_url, i.is_anonymous,
      i.closure_outcome, i.closure_details,
      duplicate_parent.incident_id AS duplicate_of_incident_id,
      duplicate_parent.title AS duplicate_of_title,
      duplicate_parent.status AS duplicate_of_status,
      c.constellation_id,
      c.status AS constellation_status,
      c.confidence_state AS constellation_confidence_state,
      c.supporting_signals AS constellation_supporting_signals,
      c.contradicting_signals AS constellation_contradicting_signals,
      c.summary AS constellation_summary,
      c.expires_at AS constellation_expires_at,
      u.username, u.email,
      COUNT(*) OVER() as total_count
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
    LEFT JOIN LATERAL (
      WITH RECURSIVE parent_chain(report_id, depth, path) AS (
        SELECT rl.canonical_report_id, 1, ARRAY[dr.report_id, rl.canonical_report_id]
        FROM reports dr
        JOIN report_links rl ON rl.duplicate_report_id = dr.report_id
          AND rl.link_type = 'duplicate'
        WHERE dr.incident_id = i.incident_id
        UNION ALL
        SELECT rl.canonical_report_id, pc.depth + 1, pc.path || rl.canonical_report_id
        FROM parent_chain pc
        JOIN report_links rl ON rl.duplicate_report_id = pc.report_id
          AND rl.link_type = 'duplicate'
        WHERE pc.depth < 20
          AND NOT rl.canonical_report_id = ANY(pc.path)
      )
      SELECT ci.incident_id, ci.title, ci.status
      FROM parent_chain pc
      JOIN reports cr ON cr.report_id = pc.report_id
      JOIN incidents ci ON ci.incident_id = cr.incident_id
      ORDER BY pc.depth DESC
      LIMIT 1
    ) duplicate_parent ON TRUE
    LEFT JOIN LATERAL (
      SELECT constellation_id, status, confidence_state, supporting_signals,
             contradicting_signals, summary, expires_at
      FROM incident_constellations c
      WHERE c.incident_id = i.incident_id
        AND c.status = 'active'
        AND c.expires_at > NOW()
      ORDER BY c.created_at DESC
      LIMIT 1
    ) c ON TRUE
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
  const normalizedIncidents = incidents.map(({ total_count: _totalCount, ...incident }) => {
    const constellation = incident.constellation_id
      ? {
          constellationId: incident.constellation_id,
          status: incident.constellation_status,
          confidenceState: incident.constellation_confidence_state,
          supportingSignals: incident.constellation_supporting_signals || 0,
          contradictingSignals: incident.constellation_contradicting_signals || 0,
          summary: incident.constellation_summary || null,
          expiresAt: incident.constellation_expires_at,
        }
      : null;

    delete incident.constellation_id;
    delete incident.constellation_status;
    delete incident.constellation_confidence_state;
    delete incident.constellation_supporting_signals;
    delete incident.constellation_contradicting_signals;
    delete incident.constellation_summary;
    delete incident.constellation_expires_at;

    return { ...incident, constellation };
  });

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
const formatIncidentConstellation = (row, includeStaffDetails) => {
  if (!row.constellation_constellation_id) {
    return null;
  }

  const constellation = {
    constellationId: row.constellation_constellation_id,
    status: row.constellation_status,
    expiresAt: row.constellation_expires_at,
  };

  if (includeStaffDetails) {
    return formatStaffConstellation(row);
  }

  if (row.constellation_status !== 'flagged') {
    constellation.centerLatitude = Number(Number(row.constellation_center_latitude).toFixed(2));
    constellation.centerLongitude = Number(Number(row.constellation_center_longitude).toFixed(2));
    constellation.radiusMeters = row.constellation_radius_meters;
    constellation.confidenceState = row.constellation_confidence_state;
    constellation.confidenceScore = row.constellation_confidence_score === null ? null : Number(row.constellation_confidence_score);
    constellation.summary = row.constellation_summary;
  }

  return constellation;
};

const staffConstellationSelect = (alias) => `,
      ${alias}.constellation_id AS constellation_constellation_id,
      ${alias}.status AS constellation_status,
      ${alias}.center_latitude AS constellation_center_latitude,
      ${alias}.center_longitude AS constellation_center_longitude,
      ${alias}.radius_meters AS constellation_radius_meters,
      ${alias}.opens_at AS constellation_opens_at,
      ${alias}.expires_at AS constellation_expires_at,
      ${alias}.confidence_state AS constellation_confidence_state,
      ${alias}.confidence_score AS constellation_confidence_score,
      ${alias}.summary AS constellation_summary,
      ${alias}.supporting_signals AS constellation_supporting_signals,
      ${alias}.contradicting_signals AS constellation_contradicting_signals,
      ${alias}.ongoing_assessment AS constellation_ongoing_assessment`;

const staffConstellationJoin = (incidentAlias) => `
    LEFT JOIN LATERAL (
      SELECT *
      FROM incident_constellations c
      WHERE c.incident_id = ${incidentAlias}.incident_id
        AND (
          (c.status = 'active' AND c.expires_at > NOW())
          OR c.status = 'flagged'
        )
      ORDER BY c.created_at DESC
      LIMIT 1
    ) c ON TRUE`;

const formatStaffConstellation = (row) => {
  if (!row.constellation_constellation_id) {
    return null;
  }

  const toNullableNumber = (value) =>
    value === null || value === undefined ? null : Number(value);

  return {
    constellationId: row.constellation_constellation_id,
    status: row.constellation_status,
    confidenceState: row.constellation_confidence_state,
    confidenceScore: toNullableNumber(row.constellation_confidence_score),
    supportingSignals: row.constellation_supporting_signals || 0,
    contradictingSignals: row.constellation_contradicting_signals || 0,
    ongoingAssessment: row.constellation_ongoing_assessment || null,
    summary: row.constellation_summary || null,
    opensAt: row.constellation_opens_at,
    expiresAt: row.constellation_expires_at,
    radiusMeters: row.constellation_radius_meters,
    centerLatitude: toNullableNumber(row.constellation_center_latitude),
    centerLongitude: toNullableNumber(row.constellation_center_longitude),
  };
};

const formatIncidentWithStaffConstellation = (row) => {
  const {
    constellation_constellation_id,
    constellation_status,
    constellation_center_latitude,
    constellation_center_longitude,
    constellation_radius_meters,
    constellation_opens_at,
    constellation_expires_at,
    constellation_confidence_state,
    constellation_confidence_score,
    constellation_summary,
    constellation_supporting_signals,
    constellation_contradicting_signals,
    constellation_ongoing_assessment,
    ...incident
  } = row;

  incident.constellation = formatStaffConstellation({
    constellation_constellation_id,
    constellation_status,
    constellation_center_latitude,
    constellation_center_longitude,
    constellation_radius_meters,
    constellation_opens_at,
    constellation_expires_at,
    constellation_confidence_state,
    constellation_confidence_score,
    constellation_summary,
    constellation_supporting_signals,
    constellation_contradicting_signals,
    constellation_ongoing_assessment,
  });

  return incident;
};

const formatIncidentDetail = (row, includeStaffDetails, viewerUserId = null) => {
  const {
    constellation_constellation_id,
    constellation_status,
    constellation_center_latitude,
    constellation_center_longitude,
    constellation_radius_meters,
    constellation_opens_at,
    constellation_expires_at,
    constellation_confidence_state,
    constellation_confidence_score,
    constellation_summary,
    constellation_supporting_signals,
    constellation_contradicting_signals,
    constellation_ongoing_assessment,
    ...incident
  } = row;

  incident.is_owner =
    viewerUserId != null && Number(viewerUserId) === Number(incident.reporter_id);

  if (!includeStaffDetails) {
    incident.username = null;
    incident.email = null;
    incident.reporter_id = null;
    if (PUBLIC_DETAIL_MEDIA_STATUSES.has(incident.status) && incident.is_disclosed && !incident.is_media_disclosed) {
      incident.photo_urls = [];
      incident.video_url = null;
    }
  }

  incident.constellation = formatIncidentConstellation({
    constellation_constellation_id,
    constellation_status,
    constellation_center_latitude,
    constellation_center_longitude,
    constellation_radius_meters,
    constellation_opens_at,
    constellation_expires_at,
    constellation_confidence_state,
    constellation_confidence_score,
    constellation_summary,
    constellation_supporting_signals,
    constellation_contradicting_signals,
    constellation_ongoing_assessment,
  }, includeStaffDetails);

  return incident;
};

async function getIncidentDetailRow(incidentId) {
  return db.oneOrNone(
    `SELECT
       i.*,
       u.username,
       u.email,
       c.constellation_id AS constellation_constellation_id,
       c.status AS constellation_status,
       c.center_latitude AS constellation_center_latitude,
       c.center_longitude AS constellation_center_longitude,
       c.radius_meters AS constellation_radius_meters,
       c.opens_at AS constellation_opens_at,
       c.expires_at AS constellation_expires_at,
       c.confidence_state AS constellation_confidence_state,
       c.confidence_score AS constellation_confidence_score,
       c.summary AS constellation_summary,
       c.supporting_signals AS constellation_supporting_signals,
       c.contradicting_signals AS constellation_contradicting_signals,
       c.ongoing_assessment AS constellation_ongoing_assessment
     FROM incidents i
     JOIN users u ON i.reporter_id = u.user_id
     LEFT JOIN LATERAL (
       SELECT *
       FROM incident_constellations c
       WHERE c.incident_id = i.incident_id
         AND (
           (c.status = 'active' AND c.expires_at > NOW())
           OR c.status = 'flagged'
         )
       ORDER BY c.created_at DESC
       LIMIT 1
     ) c ON TRUE
     WHERE i.incident_id = $1`,
    [incidentId]
  );
}

async function getPublicIncidentById(incidentId, viewerUserId = null) {
  const row = await getIncidentDetailRow(incidentId);
  return row ? formatIncidentDetail(row, false, viewerUserId) : null;
}

async function getStaffIncidentById(incidentId, viewerUserId = null) {
  const row = await getIncidentDetailRow(incidentId);
  return row ? formatIncidentDetail(row, true, viewerUserId) : null;
}

async function getIncidentForRequest(incidentId, user) {
  const viewerUserId = user?.userId ?? null;
  if (user && STAFF_ROLES.has(user.role)) {
    return getStaffIncidentById(incidentId, viewerUserId);
  }

  return getPublicIncidentById(incidentId, viewerUserId);
}

const PUBLIC_INTERACTABLE_STATUSES = ['police_closed', 'resolved', 'published'];

async function assertIncidentInteractable(incidentId, user) {
  const row = await db.oneOrNone(
    'SELECT reporter_id, is_draft, is_disclosed, status FROM incidents WHERE incident_id = $1',
    [incidentId]
  );
  if (!row) {
    throw ServiceError.notFound('Incident');
  }
  if (row.is_draft) {
    throw ServiceError.forbidden('This incident is not available for that action');
  }

  const isStaff = Boolean(user && STAFF_ROLES.has(user.role));
  const isOwner = Boolean(user && Number(user.userId) === Number(row.reporter_id));
  const isPublic = row.is_disclosed === true && PUBLIC_INTERACTABLE_STATUSES.includes(row.status);

  if (!isPublic && !isOwner && !isStaff) {
    throw ServiceError.forbidden('This incident is not available for that action');
  }
  return row;
}

function formatLinkedDuplicateIncident(row) {
  return {
    incidentId: row.incident_id,
    reportId: row.report_id,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    reporter: row.username || 'Anonymous',
    locationName: row.location_name,
    latitude: row.latitude === null || row.latitude === undefined
      ? null
      : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined
      ? null
      : Number(row.longitude),
    incidentDate: row.incident_date,
    createdAt: row.created_at,
    linkedAt: row.linked_at,
    linkedDepth: Number(row.linked_depth || 1),
    photoUrls: row.photo_urls || [],
    videoUrl: row.video_url || null,
  };
}

async function getLinkedDuplicateIncidentSummaries(incidentId) {
  const rows = await db.manyOrNone(
    `WITH RECURSIVE duplicate_tree AS (
       SELECT
         rl.duplicate_report_id,
         rl.created_at AS linked_at,
         1 AS linked_depth,
         ARRAY[rl.canonical_report_id, rl.duplicate_report_id] AS path
       FROM reports canonical_report
       JOIN report_links rl ON rl.canonical_report_id = canonical_report.report_id
        AND rl.link_type = 'duplicate'
       WHERE canonical_report.incident_id = $1

       UNION ALL

       SELECT
         child_link.duplicate_report_id,
         child_link.created_at,
         duplicate_tree.linked_depth + 1,
         duplicate_tree.path || child_link.duplicate_report_id
       FROM duplicate_tree
       JOIN report_links child_link ON child_link.canonical_report_id = duplicate_tree.duplicate_report_id
        AND child_link.link_type = 'duplicate'
       WHERE duplicate_tree.linked_depth < 20
         AND NOT child_link.duplicate_report_id = ANY(duplicate_tree.path)
     ),
     ranked_duplicates AS (
       SELECT
         duplicate_tree.*,
         ROW_NUMBER() OVER (
           PARTITION BY duplicate_report.incident_id
           ORDER BY duplicate_tree.linked_depth ASC, duplicate_tree.linked_at DESC
         ) AS duplicate_rank,
         duplicate_report.report_id,
         duplicate.incident_id,
         duplicate.title,
         duplicate.description,
         duplicate.category,
         duplicate.severity,
         duplicate.status,
         duplicate.latitude,
         duplicate.longitude,
         duplicate.location_name,
         duplicate.incident_date,
         duplicate.created_at,
         duplicate.photo_urls,
         duplicate.video_url,
         reporter.username
       FROM duplicate_tree
       JOIN reports duplicate_report ON duplicate_report.report_id = duplicate_tree.duplicate_report_id
       JOIN incidents duplicate ON duplicate.incident_id = duplicate_report.incident_id
       JOIN users reporter ON reporter.user_id = duplicate.reporter_id
     )
     SELECT *
     FROM ranked_duplicates
     WHERE duplicate_rank = 1
     ORDER BY linked_at DESC, incident_date DESC`,
    [incidentId]
  );

  return rows.map(formatLinkedDuplicateIncident);
}

/**
 * Get latest dedup candidates for an incident
 * @param {number} incidentId - The incident ID
 * @returns {Promise<Object>} Dedup candidates payload
 */
async function getIncidentDedupCandidates(incidentId) {
  const incident = await db.oneOrNone(
    'SELECT incident_id FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  const [dedup, linkedDuplicates] = await Promise.all([
    db.oneOrNone(
      `SELECT rm.dedup_candidates, rm.confidence, rm.created_at, r.report_id
       FROM reports r
       JOIN report_ml rm ON rm.report_id = r.report_id
       WHERE r.incident_id = $1
       ORDER BY rm.created_at DESC
       LIMIT 1`,
      [incidentId]
    ),
    getLinkedDuplicateIncidentSummaries(incidentId),
  ]);

  return {
    reportId: dedup?.report_id || null,
    confidence: dedup?.confidence ? Number(dedup.confidence) : 0,
    linkedDuplicates,
    dedupCandidates: dedup?.dedup_candidates || {
      generatedAt: null,
      radiusMeters: LIMITS.DEDUP.RADIUS_METERS,
      timeHours: LIMITS.DEDUP.TIME_HOURS,
      candidates: [],
    },
  };
}

/**
 * Get latest ML summary for an incident
 * @param {number} incidentId - The incident ID
 * @returns {Promise<Object>} ML summary payload
 */
async function getIncidentMlSummary(incidentId) {
  const incident = await db.oneOrNone(
    'SELECT incident_id, category, severity, status FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  const ml = await db.oneOrNone(
    `SELECT
       rm.predicted_category,
       rm.confidence,
       rm.risk_score,
       rm.toxicity_score,
       rm.is_toxic,
       rm.media_judgment_status,
       rm.media_judgment,
       rm.media_judgment_error,
       rm.media_judgment_input_hash,
       rm.media_judgment_generated_at,
       rm.created_at
     FROM reports r
     JOIN report_ml rm ON rm.report_id = r.report_id
     WHERE r.incident_id = $1
     ORDER BY rm.created_at DESC
     LIMIT 1`,
    [incidentId]
  );

  return {
    incidentId,
    currentCategory: incident.category,
    currentSeverity: incident.severity,
    currentStatus: incident.status,
    predictedCategory: ml?.predicted_category || null,
    categoryConfidence: ml?.confidence ? Number(ml.confidence) : 0,
    riskScore: ml?.risk_score ? Number(ml.risk_score) : 0,
    toxicityScore: ml?.toxicity_score ? Number(ml.toxicity_score) : 0,
    isToxic: Boolean(ml?.is_toxic),
    mediaJudgmentStatus: ml?.media_judgment_status || null,
    mediaJudgment: ml?.media_judgment || null,
    mediaJudgmentError: ml?.media_judgment_error || null,
    mediaJudgmentInputHash: ml?.media_judgment_input_hash || null,
    mediaJudgmentGeneratedAt: ml?.media_judgment_generated_at || null,
    generatedAt: ml?.created_at || null,
  };
}

async function retryIncidentMediaJudgment(incidentId) {
  return mediaJudgmentService.analyzeIncidentMedia(incidentId, { force: true });
}

/**
 * Link a duplicate incident to a canonical incident
 * @param {number} incidentId - Canonical incident
 * @param {number} duplicateIncidentId - Duplicate incident
 * @param {Object} requestingUser - The user making the request
 */
async function linkDuplicateIncident(incidentId, duplicateIncidentId, requestingUser) {
  if (incidentId === duplicateIncidentId) {
    throw ServiceError.badRequest('Incident cannot be linked to itself');
  }

  const [requestedCanonical, requestedDuplicate] = await Promise.all([
    db.oneOrNone('SELECT * FROM incidents WHERE incident_id = $1', [incidentId]),
    db.oneOrNone('SELECT * FROM incidents WHERE incident_id = $1', [duplicateIncidentId]),
  ]);

  if (!requestedCanonical || !requestedDuplicate) {
    throw ServiceError.notFound('Incident');
  }

  const ensureReport = async (incident) => {
    const existing = await db.oneOrNone('SELECT report_id FROM reports WHERE incident_id = $1', [incident.incident_id]);
    if (existing) return existing.report_id;

    const report = await db.one(
      `INSERT INTO reports (incident_id, photo_urls, video_url, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING report_id`,
      [incident.incident_id, incident.photo_urls || null, incident.video_url || null, { source: 'incident' }]
    );

    return report.report_id;
  };

  const [requestedCanonicalReportId, requestedDuplicateReportId] = await Promise.all([
    ensureReport(requestedCanonical),
    ensureReport(requestedDuplicate),
  ]);

  const [requestedCanonicalParent, requestedDuplicateParent] = await Promise.all([
    getDuplicateParentForReport(requestedCanonicalReportId),
    getDuplicateParentForReport(requestedDuplicateReportId),
  ]);

  const existingLinks = await db.manyOrNone(
    `SELECT canonical_report_id, duplicate_report_id
     FROM report_links
     WHERE link_type = 'duplicate'
       AND (
         (canonical_report_id = $1 AND duplicate_report_id = $2)
         OR (canonical_report_id = $2 AND duplicate_report_id = $1)
       )`,
    [requestedCanonicalReportId, requestedDuplicateReportId]
  );

  let canonical = requestedCanonical;
  let duplicate = requestedDuplicate;
  let canonicalReportId = requestedCanonicalReportId;
  let duplicateReportId = requestedDuplicateReportId;

  const hasReverseLink = existingLinks.some((link) => (
    Number(link.canonical_report_id) === Number(requestedDuplicateReportId)
    && Number(link.duplicate_report_id) === Number(requestedCanonicalReportId)
  ));

  if (hasReverseLink) {
    canonical = requestedDuplicate;
    duplicate = requestedCanonical;
    canonicalReportId = requestedDuplicateReportId;
    duplicateReportId = requestedCanonicalReportId;
  }

  if (requestedDuplicateParent) {
    canonical = requestedDuplicateParent;
    canonicalReportId = requestedDuplicateParent.report_id;
    if (Number(requestedDuplicateParent.incident_id) === Number(requestedCanonical.incident_id)) {
      duplicate = requestedDuplicate;
      duplicateReportId = requestedDuplicateReportId;
    } else {
      duplicate = requestedCanonical;
      duplicateReportId = requestedCanonicalReportId;
    }
  } else if (requestedCanonicalParent) {
    canonical = requestedCanonicalParent;
    canonicalReportId = requestedCanonicalParent.report_id;
    if (Number(requestedCanonicalParent.incident_id) === Number(requestedDuplicate.incident_id)) {
      duplicate = requestedCanonical;
      duplicateReportId = requestedCanonicalReportId;
    } else {
      duplicate = requestedDuplicate;
      duplicateReportId = requestedDuplicateReportId;
    }
  }

  if (Number(canonical.incident_id) === Number(duplicate.incident_id)) {
    throw ServiceError.badRequest('Canonical and duplicate incidents resolved to the same report');
  }

  await db.none(
    `DELETE FROM report_links
     WHERE link_type = 'duplicate'
       AND canonical_report_id = $1
       AND duplicate_report_id = $2`,
    [duplicateReportId, canonicalReportId]
  );

  await db.none(
    `DELETE FROM report_links
     WHERE link_type = 'duplicate'
       AND duplicate_report_id = $1
       AND canonical_report_id <> $2`,
    [duplicateReportId, canonicalReportId]
  );

  await db.none(
    `INSERT INTO report_links (canonical_report_id, duplicate_report_id, link_type)
     VALUES ($1, $2, 'duplicate')
     ON CONFLICT (canonical_report_id, duplicate_report_id) DO NOTHING`,
    [canonicalReportId, duplicateReportId]
  );

  const updatedDuplicate = await db.one(
    `UPDATE incidents
     SET status = 'merged',
         ${getLifecycleTimestampUpdate("'merged'")}
         updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [duplicate.incident_id]
  );

  await logAction(canonical.incident_id, requestingUser.userId, 'merged', `Merged duplicate incident ${duplicate.incident_id}`);
  await logAction(duplicate.incident_id, requestingUser.userId, 'merged', `Marked as duplicate of ${canonical.incident_id}`);

  // Record moderator verdict in report_ml so the ground-truth label is captured
  // alongside the AI's original dedup score for offline calibration.
  try {
    await db.none(
      `UPDATE report_ml
       SET dedup_verdict = 'confirmed_duplicate',
           dedup_verdict_by = $1,
           dedup_verdict_at = CURRENT_TIMESTAMP
        WHERE report_id = (
          SELECT report_id FROM reports WHERE incident_id = $2 ORDER BY created_at DESC LIMIT 1
        )`,
      [requestingUser.userId, duplicate.incident_id]
    );
  } catch (verdictError) {
    logger.warn(`Failed to record dedup verdict for incident ${duplicate.incident_id}: ${verdictError.message}`);
  }

  mediaJudgmentService.queueIncidentMediaAnalysis(duplicate.incident_id, { force: true });

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedDuplicate.incident_id,
    status: updatedDuplicate.status,
    severity: updatedDuplicate.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updatedDuplicate, {
      previousStatus: duplicate.status,
      nextStatus: updatedDuplicate.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for duplicate merge on incident ${duplicate.incident_id}: ${error.message}`);
  }

  await notifyReporterStatusUpdate(updatedDuplicate, {
    previousStatus: duplicate.status,
    nextStatus: updatedDuplicate.status,
    actorUserId: requestingUser.userId,
  }, 'duplicate merge');

  return {
    canonicalIncidentId: canonical.incident_id,
    duplicateIncidentId: duplicate.incident_id,
    status: updatedDuplicate.status,
  };
}

/**
 * Record a moderator's explicit dismissal of the AI's duplicate flag.
 * Logs 'not_duplicate' verdict in report_ml for offline calibration.
 * Does NOT change the incident's status — the flag is simply noted as wrong.
 *
 * @param {number} incidentId - The incident whose duplicate flag is being dismissed
 * @param {Object} requestingUser
 */
async function dismissDuplicateFlag(incidentId, requestingUser) {
  const incident = await db.oneOrNone('SELECT incident_id FROM incidents WHERE incident_id = $1', [incidentId]);
  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  const updated = await db.oneOrNone(
    `UPDATE report_ml
     SET dedup_verdict = 'not_duplicate',
         dedup_verdict_by = $1,
         dedup_verdict_at = CURRENT_TIMESTAMP
     WHERE report_id = (
       SELECT report_id FROM reports WHERE incident_id = $2 ORDER BY created_at DESC LIMIT 1
     )
     RETURNING ml_id`,
    [requestingUser.userId, incidentId]
  );

  if (!updated) {
    throw ServiceError.notFound('No ML record found for this incident');
  }

  await logAction(
    incidentId,
    requestingUser.userId,
    'flagged',
    'Duplicate flag dismissed by moderator — incident confirmed as distinct'
  );

  logger.info(`Dedup flag dismissed on incident ${incidentId} by user ${requestingUser.userId}`);
  return { incidentId, verdict: 'not_duplicate' };
}

/**
 * Update incident category for moderation feedback loop
 * @param {number} incidentId
 * @param {string} category
 * @param {Object} requestingUser
 */
async function updateIncidentCategoryForModeration(incidentId, category, requestingUser) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw ServiceError.badRequest('Invalid category');
  }

  const incident = await db.oneOrNone('SELECT * FROM incidents WHERE incident_id = $1', [incidentId]);
  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  const updatedIncident = await db.one(
    `UPDATE incidents
     SET category = $2, updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [incidentId, category]
  );

  await logAction(
    incidentId,
    requestingUser.userId,
    'status_changed',
    `Category updated from ${incident.category} to ${category}`
  );

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updatedIncident, {
      actorRole: requestingUser.role,
      notes: `Category updated from ${incident.category} to ${category}`,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for category update on incident ${incidentId}: ${error.message}`);
  }

  return updatedIncident;
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
    photoUrls,
    videoUrl,
  } = updateData;
  const normalizedIsDraft = isDraft === undefined ? undefined : normalizeBoolean(isDraft);

  // Determine new status based on isDraft flag
  let newStatus = status;
  if (normalizedIsDraft === false && incident.is_draft === true) {
    // Converting draft to submitted
    newStatus = 'submitted';
  } else if (normalizedIsDraft === true) {
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
         ${getLifecycleTimestampUpdate('COALESCE($6, status)', '$6 IS NOT NULL')}
         is_draft = COALESCE($7, is_draft),
         location_name = COALESCE($8, location_name),
         latitude = COALESCE($9, latitude),
         longitude = COALESCE($10, longitude),
         photo_urls = COALESCE($11, photo_urls),
         video_url = COALESCE($12, video_url),
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
      normalizedIsDraft !== undefined ? normalizedIsDraft : null,
      locationName,
      latitude,
      longitude,
      Array.isArray(photoUrls) ? photoUrls : null,
      videoUrl || null,
    ]
  );

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updatedIncident, {
      previousStatus: incident.status,
      nextStatus: updatedIncident.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for incident update ${incidentId}: ${error.message}`);
  }

  await notifyReporterStatusUpdate(updatedIncident, {
    previousStatus: incident.status,
    nextStatus: updatedIncident.status,
    actorUserId: requestingUser.userId,
  }, 'incident update');

  if (normalizedIsDraft === false && incident.is_draft === true) {
    await ensureReportMediaRecord(updatedIncident);
  }

  return updatedIncident;
}

async function ensureReportMediaRecord(incident) {
  const existingReport = await db.oneOrNone(
    'SELECT report_id FROM reports WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1',
    [incident.incident_id]
  );

  if (existingReport) {
    await db.none(
      `UPDATE reports
       SET photo_urls = $2,
           video_url = $3
       WHERE report_id = $1`,
      [existingReport.report_id, incident.photo_urls || null, incident.video_url || null]
    );
    return;
  }

  await db.none(
    `INSERT INTO reports (incident_id, photo_urls, video_url, metadata)
     VALUES ($1, $2, $3, $4)`,
    [incident.incident_id, incident.photo_urls || null, incident.video_url || null, { source: 'incident' }]
  );
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
         ${getLifecycleTimestampUpdate('COALESCE($6, status)', '$6 IS NOT NULL')}
         updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [incidentId, title, description, category, severity, status]
  );

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updatedIncident, {
      previousStatus: incident.status,
      nextStatus: updatedIncident.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for patch update on incident ${incidentId}: ${error.message}`);
  }

  await notifyReporterStatusUpdate(updatedIncident, {
    previousStatus: incident.status,
    nextStatus: updatedIncident.status,
    actorUserId: requestingUser.userId,
  }, 'patch update');

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

async function notifyReporterStatusUpdate(incident, metadata, context) {
  try {
    await notificationService.notifyReporterIncidentEvent('incident:status_update', incident, metadata);
  } catch (error) {
    logger.warn(`Failed to notify reporter for ${context} on incident ${incident.incident_id}: ${error.message}`);
  }

  try {
    await notificationService.notifyFollowersIncidentEvent('incident:status_update', incident, metadata);
  } catch (error) {
    logger.warn(`Failed to notify followers for ${context} on incident ${incident.incident_id}: ${error.message}`);
  }
}

function validateLEIStatusTransition(currentStatus, nextStatus) {
  const transitions = {
    verified: ['dispatched', 'investigating', 'police_closed'],
    dispatched: ['on_scene', 'investigating', 'police_closed'],
    on_scene: ['investigating', 'police_closed'],
    investigating: ['police_closed'],
    police_closed: [],
  };

  const allowedNext = transitions[currentStatus] || [];
  return allowedNext.includes(nextStatus);
}

async function getLEIIncidents(filters = {}) {
  const { status } = filters;

  if (status && status !== 'all' && !LEI_STATUSES.includes(status)) {
    throw ServiceError.badRequest('Invalid law enforcement status filter');
  }

  const params = [];
  let paramCount = 1;

  let query = `
    SELECT i.*, u.username, u.email
      ${staffConstellationSelect('c')}
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
    ${staffConstellationJoin('i')}
    WHERE i.is_draft = FALSE
      AND i.status = ANY($${paramCount}::text[])
  `;

  const statuses = status && status !== 'all' ? [status] : LEI_STATUSES;
  params.push(statuses);
  paramCount++;

  query += `
    ORDER BY
      CASE i.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      i.incident_date DESC
  `;

  const incidents = await db.manyOrNone(query, params);
  return incidents.map(formatIncidentWithStaffConstellation);
}

async function getLEIIncidentById(incidentId) {
  const incidentQuery = db.oneOrNone(
    `SELECT i.*, u.username, u.email
       ${staffConstellationSelect('c')}
     FROM incidents i
     JOIN users u ON i.reporter_id = u.user_id
     ${staffConstellationJoin('i')}
     WHERE i.incident_id = $1`,
    [incidentId]
  );

  const actionsQuery = db.manyOrNone(
    `SELECT 
       ra.action_id,
       ra.moderator_id,
       ra.action_type,
       ra.notes,
       ra.timestamp,
       u.username as moderator_name,
       u.email as moderator_email
     FROM report_actions ra
     LEFT JOIN users u ON ra.moderator_id = u.user_id
     WHERE ra.incident_id = $1
     ORDER BY ra.timestamp DESC`,
    [incidentId]
  );

  const [incident, actions, linkedDuplicates] = await Promise.all([
    incidentQuery,
    actionsQuery,
    getLinkedDuplicateIncidentSummaries(incidentId),
  ]);

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  return {
    incident: formatIncidentWithStaffConstellation(incident),
    actions,
    linkedDuplicates,
  };
}

function incidentHasMedia(incident) {
  return Boolean((incident.photo_urls || []).length || incident.video_url);
}

async function updateLEIStatus(incidentId, status, closureOutcome, closureDetails, requestingUser, { isDisclosed, isLocationFuzzed, isMediaDisclosed } = {}) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  if (!LEI_STATUSES.includes(status)) {
    throw ServiceError.badRequest('Invalid law enforcement status');
  }

  if (!validateLEIStatusTransition(incident.status, status)) {
    throw ServiceError.badRequest('Invalid status transition for law enforcement workflow');
  }

  if (status === 'police_closed') {
    if (!closureOutcome || !VALID_CLOSURE_OUTCOMES.includes(closureOutcome)) {
      throw ServiceError.badRequest('Valid closure_outcome is required to close a case');
    }

    if (closureOutcome === 'report_filed' && !closureDetails?.case_id) {
      throw ServiceError.badRequest('case_id is required when outcome is report_filed');
    }
  }

  const safeClosureDetails = status === 'police_closed'
    ? {
        case_id: closureDetails?.case_id || null,
        officer_notes: closureDetails?.officer_notes || null,
        responding_officer_id: requestingUser.userId,
      }
    : null;
  const hasDisclosureInput = isDisclosed !== undefined && isDisclosed !== null;
  const normalizedLocationFuzzed = hasDisclosureInput && isDisclosed ? isLocationFuzzed : false;
  const normalizedMediaDisclosed = hasDisclosureInput && isDisclosed && incidentHasMedia(incident)
    ? Boolean(isMediaDisclosed)
    : false;

  const updatedIncident = await db.one(
    `UPDATE incidents
     SET status = $2,
         ${getLifecycleTimestampUpdate('$2')}
         is_disclosed = COALESCE($5, is_disclosed),
         is_location_fuzzed = COALESCE($6, is_location_fuzzed),
         is_media_disclosed = COALESCE($7, is_media_disclosed),
         closure_outcome = $3,
         closure_details = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [
      incidentId,
      status,
      status === 'police_closed' ? closureOutcome : null,
      status === 'police_closed' ? safeClosureDetails : null,
      isDisclosed ?? null,
      status === 'police_closed' && hasDisclosureInput ? normalizedLocationFuzzed : null,
      status === 'police_closed' && hasDisclosureInput ? normalizedMediaDisclosed : null,
    ]
  );

  await logAction(
    incidentId,
    requestingUser.userId,
    'status_changed',
    status === 'police_closed'
      ? `Closed with outcome: ${closureOutcome}`
      : `Status changed to ${status}`
  );

  emitToRoles(['moderator', 'admin', 'law_enforcement'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updatedIncident, {
      previousStatus: incident.status,
      nextStatus: updatedIncident.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for LEI status update on incident ${incidentId}: ${error.message}`);
  }

  await notifyReporterStatusUpdate(updatedIncident, {
    previousStatus: incident.status,
    nextStatus: updatedIncident.status,
    actorUserId: requestingUser.userId,
  }, 'LEI status update');

  return updatedIncident;
}

async function updateLEIDisclosureSettings(incidentId, requestingUser, { isDisclosed, isLocationFuzzed, isMediaDisclosed }) {
  const incident = await db.oneOrNone(
    'SELECT * FROM incidents WHERE incident_id = $1',
    [incidentId]
  );

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  if (incident.status !== 'police_closed') {
    throw ServiceError.badRequest('Disclosure settings can only be updated for closed cases');
  }

  const normalizedLocationFuzzed = isDisclosed ? isLocationFuzzed : false;
  const normalizedMediaDisclosed = isDisclosed && incidentHasMedia(incident)
    ? Boolean(isMediaDisclosed)
    : false;

  const updatedIncident = await db.one(
    `UPDATE incidents
     SET is_disclosed = $2,
         is_location_fuzzed = $3,
         is_media_disclosed = $4
     WHERE incident_id = $1
     RETURNING *`,
    [incidentId, isDisclosed, normalizedLocationFuzzed, normalizedMediaDisclosed]
  );

  await logAction(
    incidentId,
    requestingUser.userId,
    'status_changed',
    `Updated community feed settings: disclosed=${updatedIncident.is_disclosed}, fuzzed=${updatedIncident.is_location_fuzzed}, media=${updatedIncident.is_media_disclosed}`
  );

  emitToRoles(['moderator', 'admin', 'law_enforcement'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updatedIncident, {
      previousStatus: incident.status,
      nextStatus: updatedIncident.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for LEI disclosure update on incident ${incidentId}: ${error.message}`);
  }

  return updatedIncident;
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

  if (!ACTIONABLE_MODERATION_STATUSES.has(incident.status)) {
    throw ServiceError.conflict(`Cannot escalate a report with status ${incident.status}`);
  }

  const updated = await db.one(
    `UPDATE incidents 
     SET status = 'verified',
         ${getLifecycleTimestampUpdate("'verified'")}
         updated_at = CURRENT_TIMESTAMP 
     WHERE incident_id = $1 
     RETURNING *`,
    [incidentId]
  );

  await logAction(incidentId, requestingUser.userId, 'verified');

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updated.incident_id,
    status: updated.status,
    severity: updated.severity,
  });

  emitLeiAlertIfNeeded(updated);

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updated, {
      previousStatus: incident.status,
      nextStatus: updated.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for verify action on incident ${incidentId}: ${error.message}`);
  }

  await notifyReporterStatusUpdate(updated, {
    previousStatus: incident.status,
    nextStatus: updated.status,
    actorUserId: requestingUser.userId,
  }, 'verify action');

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

  if (!ACTIONABLE_MODERATION_STATUSES.has(incident.status)) {
    throw ServiceError.conflict(`Cannot reject a report with status ${incident.status}`);
  }

  const updated = await db.one(
    `UPDATE incidents 
     SET status = 'rejected',
         ${getLifecycleTimestampUpdate("'rejected'")}
         is_disclosed = FALSE,
         is_location_fuzzed = FALSE,
         is_media_disclosed = FALSE,
         updated_at = CURRENT_TIMESTAMP 
     WHERE incident_id = $1 
     RETURNING *`,
    [incidentId]
  );

  await logAction(incidentId, requestingUser.userId, 'rejected');

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updated.incident_id,
    status: updated.status,
    severity: updated.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updated, {
      previousStatus: incident.status,
      nextStatus: updated.status,
      actorRole: requestingUser.role,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for rejection on incident ${incidentId}: ${error.message}`);
  }

  await notifyReporterStatusUpdate(updated, {
    previousStatus: incident.status,
    nextStatus: updated.status,
    actorUserId: requestingUser.userId,
  }, 'rejection');

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

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updated.incident_id,
    status: updated.status,
    severity: updated.severity,
  });

  try {
    await notificationService.notifyStaffIncidentEvent('incident:status_update', updated, {
      previousStatus: incident.status,
      nextStatus: updated.status,
      actorRole: requestingUser.role,
      notes: reason,
    });
  } catch (error) {
    logger.warn(`Failed to notify staff for escalation on incident ${incidentId}: ${error.message}`);
  }

  return updated;
}

/**
 * Get publicly disclosed, LE-closed incidents for the community feed.
 * If is_location_fuzzed = TRUE, apply ±150m jitter to lat/lng.
 * The fuzz flag is never returned to the client.
 */
// Days back for each supported feed timeframe. Optional — when omitted the feed
// returns the full history (the community feed relies on that).
const FEED_TIMEFRAME_DAYS = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };

async function getPublicFeed({ category, closure_outcome, severity, timeframe, lat, lng, radius, sort, search, limit = 20, offset = 0 } = {}) {
  const parsedLimit = Number.parseInt(limit, 10);
  const parsedOffset = Number.parseInt(offset, 10);
  const safeLimit = Number.isInteger(parsedLimit) ? parsedLimit : 20;
  const safeOffset = Number.isInteger(parsedOffset) ? parsedOffset : 0;

  const conditions = [
    `i.is_disclosed = TRUE`,
    `i.status IN ('police_closed', 'resolved', 'published')`,
    `i.closure_outcome IS NOT NULL`,
    `i.is_draft = FALSE`,
  ];
  const params = [];
  let p = 1;

  if (category)        { conditions.push(`i.category = $${p++}`);         params.push(category); }
  if (closure_outcome) { conditions.push(`i.closure_outcome = $${p++}`);  params.push(closure_outcome); }
  if (severity)        { conditions.push(`i.severity = $${p++}`);         params.push(severity); }

  const searchTerm = typeof search === 'string' ? search.trim() : '';
  if (searchTerm) {
    const escaped = searchTerm.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    conditions.push(`(i.title ILIKE $${p} OR i.description ILIKE $${p} OR i.location_name ILIKE $${p})`);
    params.push(`%${escaped}%`);
    p += 1;
  }

  // Optional recency window — filters on when the report was closed/resolved.
  // closed_at is only set for police_closed/resolved/archived; 'published' rows
  // have none, so we fall back to the immutable incident_date rather than
  // updated_at (which a later edit would bump, making old reports reappear).
  if (timeframe && FEED_TIMEFRAME_DAYS[timeframe]) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - FEED_TIMEFRAME_DAYS[timeframe]);
    conditions.push(`COALESCE(i.closed_at, i.incident_date) >= $${p++}`);
    params.push(startDate);
  }

  let geoJoin = '';
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null && radius !== undefined && radius !== null) {
    geoJoin = `AND ST_DWithin(i.location, ST_SetSRID(ST_MakePoint($${p++}::float, $${p++}::float), 4326)::geography, $${p++})`;
    params.push(parseFloat(lng), parseFloat(lat), parseFloat(radius));
  }

  const orderBy = sort === 'severity'
    ? `CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC, i.updated_at DESC`
    : `i.updated_at DESC`;

  const rows = await db.manyOrNone(
    `SELECT
       i.incident_id, i.title, i.description, i.category, i.severity, i.status,
       i.closure_outcome, i.closure_details,
       i.location_name,
       CASE WHEN i.is_media_disclosed THEN i.photo_urls ELSE NULL END AS photo_urls,
       CASE WHEN i.is_media_disclosed THEN i.video_url ELSE NULL END AS video_url,
       i.incident_date, i.created_at, COALESCE(i.closed_at, i.updated_at) AS closed_at,
       CASE WHEN i.is_location_fuzzed
         THEN i.latitude  + (random() - 0.5) * 0.0027
         ELSE i.latitude
       END AS latitude,
       CASE WHEN i.is_location_fuzzed
         THEN i.longitude + (random() - 0.5) * 0.0027
         ELSE i.longitude
       END AS longitude,
       (SELECT COUNT(*) FROM incident_seen_marks m WHERE m.incident_id = i.incident_id)::int AS corroboration_count
     FROM incidents i
     WHERE ${conditions.join(' AND ')} ${geoJoin}
     ORDER BY ${orderBy}
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, safeLimit, safeOffset]
  );

  const countResult = await db.one(
    `SELECT COUNT(*) AS total FROM incidents i
     WHERE ${conditions.join(' AND ')} ${geoJoin}`,
    params
  );

  return { incidents: rows, total: parseInt(countResult.total, 10) };
}

async function previewClassification({ title, description }) {
  const text = `${title || ''} ${description || ''}`.trim();
  if (text.length < 6) {
    return { available: false, reason: 'insufficient_text' };
  }

  const mlResults = await mlClient.analyzeIncident({ text });
  if (!mlResults) {
    return { available: false, reason: 'ml_unavailable' };
  }

  const predicted = mlResults.classification?.predictedCategory;
  const category = predicted && VALID_CATEGORIES.includes(predicted) ? predicted : null;
  const riskScore = mlResults.risk?.riskScore;
  const severity =
    riskScore === null || riskScore === undefined ? null : mapRiskToSeverity(riskScore);

  return {
    available: category !== null || severity !== null,
    category,
    severity,
    confidence: mlResults.classification?.confidence ?? null,
  };
}

module.exports = {
  // Constants
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,

  // Service methods
  createIncident,
  getAllIncidents,
  countIncidents,
  getUserIncidents,
  getPublicIncidentById,
  getStaffIncidentById,
  getIncidentForRequest,
  assertIncidentInteractable,
  getIncidentDedupCandidates,
  getIncidentMlSummary,
  retryIncidentMediaJudgment,
  getIncidentsByUserId,
  updateIncident,
  patchIncident,
  deleteIncident,
  updateIncidentCategoryForModeration,
  linkDuplicateIncident,
  dismissDuplicateFlag,
  verifyIncident,
  rejectIncident,
  escalateIncident,
  getLEIIncidents,
  getLEIIncidentById,
  updateLEIStatus,
  updateLEIDisclosureSettings,
  getPublicFeed,
  previewClassification,
};
