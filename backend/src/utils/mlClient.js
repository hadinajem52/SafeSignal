/**
 * ML Service Client
 * Async client for calling the Python ML microservice.
 * Falls back to heuristics if the service is unavailable.
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const logger = require('./logger');
const { LIMITS } = require('../../../constants/limits');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
// Gemini 2.5-flash regularly takes 8–17 s per call; 10 s caused silent fallback to heuristics.
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS, 10) || 35000;
const ML_MEDIA_TIMEOUT_MS = parseInt(process.env.ML_MEDIA_TIMEOUT_MS, 10) || 120000;
const ML_MEDIA_MAX_PAYLOAD_BYTES =
  parseInt(process.env.ML_MEDIA_MAX_PAYLOAD_BYTES, 10) || LIMITS.MAX_UPLOAD_BYTES * 2;

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const mlMediaClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_MEDIA_TIMEOUT_MS,
});

/**
 * Get text embedding
 * @param {string} text
 * @returns {Promise<number[]|null>}
 */
async function getEmbedding(text) {
  try {
    const response = await mlClient.post('/embed', { text });
    return response.data?.embedding || null;
  } catch (error) {
    logger.warn(`ML embedding failed: ${error.message}`);
    return null;
  }
}

/**
 * Detect toxicity in text
 * @param {string} text
 * @returns {Promise<Object|null>}
 */
async function detectToxicity(text) {
  try {
    const response = await mlClient.post('/toxicity', { text });
    return {
      isToxic: response.data?.is_toxic || false,
      toxicityScore: response.data?.toxicity_score || 0,
      isSevere: response.data?.is_severe || false,
      details: response.data?.details || {},
    };
  } catch (error) {
    logger.warn(`ML toxicity detection failed: ${error.message}`);
    return null;
  }
}

/**
 * Stage-2 contextual duplicate detection.
 * Sends both incident reports to the LLM and asks whether they describe the
 * same real-world event.  Only meaningful with ML_PROVIDER=gemini;
 * returns null when the provider does not support it.
 *
 * @param {string} baseText    - Text of the new incoming incident
 * @param {string} candidateText - Text of the candidate duplicate incident
 * @returns {Promise<{isDuplicate: boolean, confidence: number, reasoning: string}|null>}
 */
async function dedupCompare(baseText, candidateText, metadata = {}) {
  try {
    const response = await mlClient.post('/dedup/compare', {
      base_text: baseText,
      candidate_text: candidateText,
      base_category: metadata.baseCategory ?? null,
      candidate_category: metadata.candidateCategory ?? null,
      time_hours: metadata.timeHours ?? null,
      distance_meters: metadata.distanceMeters ?? null,
    });
    const data = response.data || {};
    // When local provider: provider_supported=false, confidence=0 — treat as null.
    if (data.provider_supported === false) {
      return null;
    }
    return {
      isDuplicate: Boolean(data.is_duplicate),
      confidence: data.confidence || 0,
      reasoning: data.reasoning || '',
    };
  } catch (error) {
    logger.warn(`ML pairwise dedup compare failed: ${error.message}`);
    return null;
  }
}

/**
 * Generate a structured analytics briefing from aggregated stats.
 * @param {Object} stats
 * @param {string} stats.period
 * @param {number} stats.total_incidents
 * @param {Object} stats.kpis
 * @param {Array} [stats.top_categories]
 * @param {Array} [stats.top_hotspots]
 * @param {Object} [stats.peak_activity]
 * @param {Array} [stats.funnel]
 * @param {Object} [stats.prev_period]
 * @param {"rising"|"falling"|"stable"} [stats.trend_direction]
 * @param {number} [stats.p75_response_min]
 * @param {Object} [stats.category_delta]
 * @returns {Promise<{sections: {priority: string, trend: string, pattern: string, funnel_health: string}|null, supported: boolean}|null>}
 */
async function generateInsights(stats) {
  try {
    const response = await mlClient.post('/insights', stats);
    return {
      sections: response.data?.sections ?? null,
      supported: response.data?.supported ?? false,
    };
  } catch (error) {
    logger.warn(`ML generateInsights failed: ${error.message}`);
    return null;
  }
}

/**
 * Generate a citizen-facing read of recent nearby activity from aggregated counts.
 * @param {Object} aggregate - Anonymous aggregate stats (no raw report text)
 * @returns {Promise<{insight: Object|null, supported: boolean}|null>}
 */
async function generateAreaInsights(aggregate) {
  try {
    const response = await mlClient.post('/insights/area', aggregate);
    return {
      insight: response.data?.insight ?? null,
      supported: response.data?.supported ?? false,
    };
  } catch (error) {
    logger.warn(`ML generateAreaInsights failed: ${error.message}`);
    return null;
  }
}

/**
 * Full ML analysis (classification + toxicity + risk + similarity)
 * @param {Object} params
 * @returns {Promise<Object|null>}
 */
async function analyzeIncident({
  text,
  category = null,
  severity = null,
  candidateTexts = null,
  duplicateCount = 0,
}) {
  try {
    const response = await mlClient.post('/analyze', {
      text,
      category,
      severity,
      candidate_texts: candidateTexts,
      duplicate_count: duplicateCount,
    });

    const data = response.data || {};

    return {
      classification: data.classification
        ? {
            predictedCategory: data.classification.predicted_category,
            confidence: data.classification.confidence,
            allScores: data.classification.all_scores,
          }
        : null,
      toxicity: data.toxicity
        ? {
            isToxic: data.toxicity.is_toxic,
            toxicityScore: data.toxicity.toxicity_score,
            isSevere: data.toxicity.is_severe,
            details: data.toxicity.details,
          }
        : null,
      risk: data.risk
        ? {
            riskScore: data.risk.risk_score,
            isHighRisk: data.risk.is_high_risk,
            isCritical: data.risk.is_critical,
            breakdown: data.risk.breakdown,
          }
        : null,
      similarity: data.similarity
        ? {
            similarities: data.similarity.similarities,
            threshold: data.similarity.threshold,
          }
        : null,
    };
  } catch (error) {
    logger.warn(`ML full analysis failed: ${error.message}`);
    return null;
  }
}

async function synthesizeConstellation(params) {
  try {
    const response = await mlClient.post('/constellations/synthesize', params);
    const data = response.data || {};

    return {
      confidenceState: data.confidence_state,
      confidenceScore: data.confidence_score,
      summary: data.summary || null,
      supportingSignals: data.supporting_signals,
      contradictingSignals: data.contradicting_signals,
      ongoingAssessment: data.ongoing_assessment,
      anomalyFlagged: data.anomaly_flagged,
      clusterMatchIncidentIds: data.cluster_match_incident_ids || [],
    };
  } catch (error) {
    logger.warn(`ML constellation synthesis failed: ${error.message}`);
    return null;
  }
}

async function analyzeReportMedia({ metadata, mediaFiles }) {
  try {
    const form = new FormData();
    form.append('metadata', JSON.stringify(metadata));
    const totalBytes = (mediaFiles || []).reduce(
      (sum, mediaFile) => sum + Number(mediaFile.size || 0),
      0
    );

    if (totalBytes > ML_MEDIA_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `Media analysis payload exceeds ${ML_MEDIA_MAX_PAYLOAD_BYTES} bytes`
      );
    }

    for (const mediaFile of mediaFiles || []) {
      const stream = mediaFile.buffer
        ? mediaFile.buffer
        : fs.createReadStream(mediaFile.path);
      form.append(
        'files',
        stream,
        {
          filename: mediaFile.filename,
          contentType: mediaFile.mimeType || 'application/octet-stream',
          knownLength: Number(mediaFile.size || 0) || undefined,
        }
      );
    }

    const response = await mlMediaClient.post('/media/analyze-report', form, {
      timeout: ML_MEDIA_TIMEOUT_MS,
      headers: form.getHeaders(),
      maxBodyLength: ML_MEDIA_MAX_PAYLOAD_BYTES,
      maxContentLength: ML_MEDIA_MAX_PAYLOAD_BYTES,
    });

    const data = response.data || {};
    return {
      supported: data.supported !== false,
      status: data.status || null,
      judgment: data.judgment || null,
      error: data.error || null,
    };
  } catch (error) {
    logger.warn(`ML media analysis failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  getEmbedding,
  dedupCompare,
  detectToxicity,
  generateInsights,
  generateAreaInsights,
  analyzeIncident,
  synthesizeConstellation,
  analyzeReportMedia,
};
