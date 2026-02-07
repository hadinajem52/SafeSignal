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
const mlClient = require('../utils/mlClient');

const {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,
  VALID_CLOSURE_OUTCOMES,
} = require('../../../constants/incident');
const { LIMITS } = require('../../../constants/limits');
const { emitToRoles } = require('../utils/socketService');

const LEI_STATUSES = ['verified', 'dispatched', 'on_scene', 'investigating', 'police_closed'];
const profanityFilter = new Filter();

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

/**
 * Map an ML risk score (0–1) to a severity level.
 * Thresholds calibrated against the ML risk scorer's output range
 * (category_risk * 0.35 + sev_mult * 0.35 + keywords * 0.20 + boosters).
 */
const mapRiskToSeverity = (riskScore) => {
  if (riskScore >= 0.60) return 'critical';
  if (riskScore >= 0.40) return 'high';
  if (riskScore >= 0.25) return 'medium';
  return 'low';
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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  distanceMeters,
  timeHours,
  categoryMatch,
  bothCategoriesOther,
  sameReporter,
}) => {
  const distanceScore = clamp(1 - distanceMeters / LIMITS.DEDUP.RADIUS_METERS, 0, 1);
  const timeScore = clamp(1 - timeHours / LIMITS.DEDUP.TIME_HOURS, 0, 1);
  // Both being 'other' is a catch-all match, not a meaningful category signal.
  // Give partial credit (0.3) instead of full (1.0) to avoid false positives.
  const categoryScore = categoryMatch ? (bothCategoriesOther ? 0.3 : 1) : 0;
  const sameReporterScore = sameReporter ? 1 : 0;

  const score =
    0.45 * textSimilarity +
    0.2 * distanceScore +
    0.2 * timeScore +
    0.1 * categoryScore +
    0.05 * sameReporterScore;

  return clamp(score, 0, 1);
};

const buildDedupCandidates = (incident, candidates) => {
  const baseTokens = toTokenSet(`${incident.title} ${incident.description}`);
  const incidentDate = new Date(incident.incident_date);

  return candidates
    .map((candidate) => {
      const candidateTokens = toTokenSet(`${candidate.title} ${candidate.description}`);
      const textSimilarity = jaccardSimilarity(baseTokens, candidateTokens);
      const distanceMeters = Math.max(0, parseFloat(candidate.distance_meters || 0));
      const timeHours = Math.abs(incidentDate - new Date(candidate.incident_date)) / 36e5;
      const categoryMatch = incident.category === candidate.category;
      const bothCategoriesOther = categoryMatch && incident.category === 'other';
      const sameReporter = incident.reporter_id === candidate.reporter_id;
      const score = computeDedupScore({
        textSimilarity,
        distanceMeters,
        timeHours,
        categoryMatch,
        bothCategoriesOther,
        sameReporter,
      });

      return {
        incidentId: candidate.incident_id,
        score: Number(score.toFixed(3)),
        distanceMeters: Math.round(distanceMeters),
        timeHours: Number(timeHours.toFixed(2)),
        textSimilarity: Number(textSimilarity.toFixed(3)),
        categoryMatch,
        sameReporter,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMITS.DEDUP.MAX_CANDIDATES);
};

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
    enableMlClassification,
    enableMlRisk,
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

  if (!incident.is_draft) {
    try {
      const latitudeValue = parseFloat(incident.latitude);
      const longitudeValue = parseFloat(incident.longitude);
      const mlText = `${incident.title} ${incident.description}`;
      const allowMlClassification = enableMlClassification !== false;
      const allowMlRisk = enableMlRisk !== false;
      const allowExternalMl = allowMlClassification || allowMlRisk;

      // Try external ML service first, fallback to heuristics
      let mlResults = null;
      let useExternalMl = false;
      if (allowExternalMl) {
        try {
          mlResults = await mlClient.analyzeIncident({
            text: mlText,
            category: incident.category,
            severity: incident.severity,
            duplicateCount: 0,
          });
          useExternalMl = mlResults !== null;
          if (useExternalMl) {
            logger.info(`Using external ML service for incident ${incident.incident_id}`);
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

      if (!Number.isNaN(latitudeValue) && !Number.isNaN(longitudeValue)) {
        const candidateQuery = `
          SELECT
            i.incident_id,
            i.title,
            i.description,
            i.category,
            i.incident_date,
            i.reporter_id,
            ST_Distance(
              i.location,
              ST_SetSRID(ST_MakePoint($1::float, $2::float), 4326)::geography
            ) AS distance_meters
          FROM incidents i
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

        const reportPromise = db.one(
          `INSERT INTO reports (incident_id, photo_urls, metadata, ml_confidence_score)
           VALUES ($1, $2, $3, $4)
           RETURNING report_id`,
          [
            incident.incident_id,
            incident.photo_urls || null,
            { source: 'incident' },
            categoryConfidence === null || categoryConfidence === undefined
              ? null
              : Number(categoryConfidence.toFixed(2)),
          ]
        );

        const candidatePromise = db.manyOrNone(candidateQuery, [
          longitudeValue,
          latitudeValue,
          incident.incident_id,
          incident.incident_date,
          LIMITS.DEDUP.RADIUS_METERS,
          LIMITS.DEDUP.MAX_CANDIDATES,
        ]);

        const [report, candidates] = await Promise.all([reportPromise, candidatePromise]);

        // Use ML-predicted category for dedup matching instead of the
        // frontend placeholder ('other') that hasn't been updated yet.
        const dedupIncident = predictedCategory
          ? { ...incident, category: predictedCategory }
          : incident;

        // Compute dedup with optional ML-enhanced similarity
        let scoredCandidates = buildDedupCandidates(dedupIncident, candidates);

        // Try ML-based semantic similarity if external service available
        if (useExternalMl && candidates.length > 0) {
          try {
            const candidateTexts = candidates.map((c) => `${c.title} ${c.description}`);
            const similarityResults = await mlClient.computeSimilarity(mlText, candidateTexts, 0.5);
            if (similarityResults && similarityResults.length > 0) {
              // similarityResults indices are based on the original SQL candidate order.
              // scoredCandidates may already be re-ordered, so map by incident id.
              const similarityByIncidentId = new Map(
                similarityResults
                  .filter((s) => Number.isInteger(s.index) && s.index >= 0 && s.index < candidates.length)
                  .map((s) => [candidates[s.index].incident_id, s])
              );

              // Enhance scores with ML similarity
              scoredCandidates = scoredCandidates.map((candidate) => {
                const mlSim = similarityByIncidentId.get(candidate.incidentId);
                if (mlSim) {
                  // Blend ML and Jaccard similarity (90% ML, 10% Jaccard).
                  // Jaccard fails on paraphrased text (different words, same meaning)
                  // so ML must dominate when available.
                  const blendedTextSim = 0.9 * mlSim.score + 0.1 * candidate.textSimilarity;
                  const newScore = computeDedupScore({
                    textSimilarity: blendedTextSim,
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
                    mlSimilarity: mlSim.score,
                    score: Number(newScore.toFixed(3)),
                  };
                }
                return candidate;
              }).sort((a, b) => b.score - a.score);
            }
          } catch (simError) {
            logger.warn(`ML similarity enhancement failed: ${simError.message}`);
          }
        }

        const topScore = scoredCandidates[0]?.score || 0;
        const highConfidenceDuplicates = scoredCandidates.filter((candidate) => candidate.score >= 0.55).length;

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

        // ── Link high-confidence duplicates ────────────────────────────
        if (highConfidenceDuplicates > 0) {
          const topCandidate = scoredCandidates[0];
          const canonicalReport = await db.oneOrNone(
            'SELECT report_id FROM reports WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1',
            [topCandidate.incidentId]
          );
          if (canonicalReport) {
            await db.none(
              `INSERT INTO report_links (canonical_report_id, duplicate_report_id, link_type)
               VALUES ($1, $2, 'duplicate')
               ON CONFLICT (canonical_report_id, duplicate_report_id) DO NOTHING`,
              [canonicalReport.report_id, report.report_id]
            );
            logger.info(
              `Duplicate link created: incident ${incident.incident_id} → ` +
              `incident ${topCandidate.incidentId} (score: ${topCandidate.score})`
            );
          }

          await db.none(
            `UPDATE incidents
             SET status = 'auto_processed', updated_at = CURRENT_TIMESTAMP
             WHERE incident_id = $1 AND status = 'submitted'`,
            [incident.incident_id]
          );
          // Re-read status only if it was actually changed
          const refreshed = await db.one(
            'SELECT status FROM incidents WHERE incident_id = $1',
            [incident.incident_id]
          );
          incident.status = refreshed.status;

          await logAction(
            incident.incident_id,
            null,
            'merged',
            `Auto-detected as potential duplicate of incident #${topCandidate.incidentId} (score: ${topCandidate.score})`
          );

          emitToRoles(['moderator', 'admin'], 'incident:duplicate', {
            incidentId: incident.incident_id,
            duplicateOf: topCandidate.incidentId,
            score: topCandidate.score,
            candidates: highConfidenceDuplicates,
          });
        }

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
      }
    } catch (error) {
      logger.warn(`Dedup/ML processing failed for incident ${incident.incident_id}: ${error.message}`);
    }
  }

  if (!incident.is_draft) {
    emitToRoles(['moderator', 'admin'], 'incident:new', {
      incidentId: incident.incident_id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      incidentDate: incident.incident_date,
    });
  }

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
      i.closure_outcome, i.closure_details,
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

  const dedup = await db.oneOrNone(
    `SELECT rm.dedup_candidates, rm.confidence, rm.created_at, r.report_id
     FROM reports r
     JOIN report_ml rm ON rm.report_id = r.report_id
     WHERE r.incident_id = $1
     ORDER BY rm.created_at DESC
     LIMIT 1`,
    [incidentId]
  );

  return {
    reportId: dedup?.report_id || null,
    confidence: dedup?.confidence ? Number(dedup.confidence) : 0,
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
    `SELECT rm.predicted_category, rm.confidence, rm.risk_score, rm.toxicity_score, rm.is_toxic, rm.created_at
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
    generatedAt: ml?.created_at || null,
  };
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

  const [canonical, duplicate] = await Promise.all([
    db.oneOrNone('SELECT * FROM incidents WHERE incident_id = $1', [incidentId]),
    db.oneOrNone('SELECT * FROM incidents WHERE incident_id = $1', [duplicateIncidentId]),
  ]);

  if (!canonical || !duplicate) {
    throw ServiceError.notFound('Incident');
  }

  const ensureReport = async (incident) => {
    const existing = await db.oneOrNone('SELECT report_id FROM reports WHERE incident_id = $1', [incident.incident_id]);
    if (existing) return existing.report_id;

    const report = await db.one(
      `INSERT INTO reports (incident_id, photo_urls, metadata)
       VALUES ($1, $2, $3)
       RETURNING report_id`,
      [incident.incident_id, incident.photo_urls || null, { source: 'incident' }]
    );

    return report.report_id;
  };

  const [canonicalReportId, duplicateReportId] = await Promise.all([
    ensureReport(canonical),
    ensureReport(duplicate),
  ]);

  await db.none(
    `INSERT INTO report_links (canonical_report_id, duplicate_report_id, link_type)
     VALUES ($1, $2, 'duplicate')
     ON CONFLICT (canonical_report_id, duplicate_report_id) DO NOTHING`,
    [canonicalReportId, duplicateReportId]
  );

  const updatedDuplicate = await db.one(
    `UPDATE incidents
     SET status = 'merged', updated_at = CURRENT_TIMESTAMP
     WHERE incident_id = $1
     RETURNING *`,
    [duplicateIncidentId]
  );

  await logAction(incidentId, requestingUser.userId, 'merged', `Merged duplicate incident ${duplicateIncidentId}`);
  await logAction(duplicateIncidentId, requestingUser.userId, 'merged', `Marked as duplicate of ${incidentId}`);

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedDuplicate.incident_id,
    status: updatedDuplicate.status,
    severity: updatedDuplicate.severity,
  });

  return {
    canonicalIncidentId: incidentId,
    duplicateIncidentId,
    status: updatedDuplicate.status,
  };
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

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

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

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updatedIncident.incident_id,
    status: updatedIncident.status,
    severity: updatedIncident.severity,
  });

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

function validateLEIStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;

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
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
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

  return db.manyOrNone(query, params);
}

async function getLEIIncidentById(incidentId) {
  const incidentQuery = db.oneOrNone(
    `SELECT i.*, u.username, u.email
     FROM incidents i
     JOIN users u ON i.reporter_id = u.user_id
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

  const [incident, actions] = await Promise.all([incidentQuery, actionsQuery]);

  if (!incident) {
    throw ServiceError.notFound('Incident');
  }

  return { incident, actions };
}

async function updateLEIStatus(incidentId, status, closureOutcome, closureDetails, requestingUser) {
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

  const updatedIncident = await db.one(
    `UPDATE incidents
     SET status = $2,
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

  const updated = await db.one(
    `UPDATE incidents 
     SET status = 'verified', updated_at = CURRENT_TIMESTAMP 
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

  if (['high', 'critical'].includes(updated.severity)) {
    emitToRoles(['law_enforcement', 'admin'], 'lei_alert', {
      incidentId: updated.incident_id,
      title: updated.title,
      severity: updated.severity,
      status: updated.status,
      incidentDate: updated.incident_date,
    });
  }

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

  emitToRoles(['moderator', 'admin'], 'incident:update', {
    incidentId: updated.incident_id,
    status: updated.status,
    severity: updated.severity,
  });

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
  getIncidentDedupCandidates,
  getIncidentMlSummary,
  getIncidentsByUserId,
  updateIncident,
  patchIncident,
  deleteIncident,
  updateIncidentCategoryForModeration,
  linkDuplicateIncident,
  verifyIncident,
  rejectIncident,
  escalateIncident,
  getLEIIncidents,
  getLEIIncidentById,
  updateLEIStatus,
};
