/**
 * ML Service Client
 * Async client for calling the Python ML microservice.
 * Falls back to heuristics if the service is unavailable.
 */

const axios = require('axios');
const logger = require('./logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
// Gemini 2.5-flash regularly takes 8–17 s per call; 10 s caused silent fallback to heuristics.
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS, 10) || 35000;

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Check if ML service is healthy
 * @returns {Promise<boolean>}
 */
async function isHealthy() {
  try {
    const response = await mlClient.get('/health');
    return response.data?.status === 'healthy';
  } catch (error) {
    logger.warn('ML service health check failed');
    return false;
  }
}

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
 * Compute semantic similarity between query and candidates
 * @param {string} queryText
 * @param {string[]} candidateTexts
 * @param {number} threshold
 * @returns {Promise<Array|null>}
 */
async function computeSimilarity(queryText, candidateTexts, threshold = 0.7) {
  if (!candidateTexts || candidateTexts.length === 0) {
    return [];
  }

  try {
    const response = await mlClient.post('/similarity', {
      query_text: queryText,
      candidate_texts: candidateTexts,
      threshold,
    });
    return response.data?.similarities || [];
  } catch (error) {
    logger.warn(`ML similarity failed: ${error.message}`);
    return null;
  }
}

/**
 * Classify text into incident category
 * @param {string} text
 * @param {string[]} categories
 * @returns {Promise<Object|null>}
 */
async function classifyText(text, categories = null) {
  try {
    const payload = { text };
    if (categories) {
      payload.categories = categories;
    }

    const response = await mlClient.post('/classify', payload);
    return {
      predictedCategory: response.data?.predicted_category || null,
      confidence: response.data?.confidence || 0,
      allScores: response.data?.all_scores || {},
    };
  } catch (error) {
    logger.warn(`ML classification failed: ${error.message}`);
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
 * Compute risk score
 * @param {Object} params
 * @returns {Promise<Object|null>}
 */
async function computeRisk({ text, category, severity, duplicateCount = 0, toxicityScore = 0 }) {
  try {
    const response = await mlClient.post('/risk', {
      text,
      category,
      severity,
      duplicate_count: duplicateCount,
      toxicity_score: toxicityScore,
    });
    return {
      riskScore: response.data?.risk_score || 0,
      isHighRisk: response.data?.is_high_risk || false,
      isCritical: response.data?.is_critical || false,
      breakdown: response.data?.breakdown || {},
    };
  } catch (error) {
    logger.warn(`ML risk scoring failed: ${error.message}`);
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

module.exports = {
  isHealthy,
  getEmbedding,
  computeSimilarity,
  classifyText,
  detectToxicity,
  computeRisk,
  analyzeIncident,
};
