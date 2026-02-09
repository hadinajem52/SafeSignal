/**
 * Settings Service
 * Handles dashboard settings persistence for staff users.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

const DEFAULT_SETTINGS = Object.freeze({
  emailNotifications: true,
  reportAlerts: true,
  weeklyDigest: false,
  autoVerify: false,
  minConfidenceScore: 80,
});

let settingsTableEnsured = false;

async function ensureSettingsTable() {
  if (settingsTableEnsured) {
    return;
  }

  await db.none(`
    CREATE TABLE IF NOT EXISTS moderator_settings (
      settings_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
      email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      report_alerts BOOLEAN NOT NULL DEFAULT TRUE,
      weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
      auto_verify BOOLEAN NOT NULL DEFAULT FALSE,
      min_confidence_score INTEGER NOT NULL DEFAULT 80 CHECK (min_confidence_score BETWEEN 0 AND 100),
      last_weekly_digest_sent_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.none(`
    ALTER TABLE moderator_settings
    ADD COLUMN IF NOT EXISTS last_weekly_digest_sent_at TIMESTAMP;
  `);

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings (user_id);
  `);

  settingsTableEnsured = true;
}

function mapDbRowToSettings(row) {
  return {
    emailNotifications: row.email_notifications,
    reportAlerts: row.report_alerts,
    weeklyDigest: row.weekly_digest,
    autoVerify: row.auto_verify,
    minConfidenceScore: parseInt(row.min_confidence_score, 10),
  };
}

function validateSettingsPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw ServiceError.badRequest('Settings payload is required');
  }

  const booleanKeys = ['emailNotifications', 'reportAlerts', 'weeklyDigest', 'autoVerify'];
  for (const key of booleanKeys) {
    if (typeof payload[key] !== 'boolean') {
      throw ServiceError.badRequest(`${key} must be a boolean`);
    }
  }

  const score = Number(payload.minConfidenceScore);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw ServiceError.badRequest('minConfidenceScore must be an integer between 0 and 100');
  }

  return {
    emailNotifications: payload.emailNotifications,
    reportAlerts: payload.reportAlerts,
    weeklyDigest: payload.weeklyDigest,
    autoVerify: payload.autoVerify,
    minConfidenceScore: score,
  };
}

async function upsertSettings(userId, settings) {
  await ensureSettingsTable();

  const saved = await db.one(
    `INSERT INTO moderator_settings (
      user_id,
      email_notifications,
      report_alerts,
      weekly_digest,
      auto_verify,
      min_confidence_score
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id)
    DO UPDATE SET
      email_notifications = EXCLUDED.email_notifications,
      report_alerts = EXCLUDED.report_alerts,
      weekly_digest = EXCLUDED.weekly_digest,
      auto_verify = EXCLUDED.auto_verify,
      min_confidence_score = EXCLUDED.min_confidence_score,
      updated_at = CURRENT_TIMESTAMP
    RETURNING
      email_notifications,
      report_alerts,
      weekly_digest,
      auto_verify,
      min_confidence_score`,
    [
      userId,
      settings.emailNotifications,
      settings.reportAlerts,
      settings.weeklyDigest,
      settings.autoVerify,
      settings.minConfidenceScore,
    ]
  );

  return mapDbRowToSettings(saved);
}

async function getSettingsForUser(userId) {
  await ensureSettingsTable();

  const existing = await db.oneOrNone(
    `SELECT
      email_notifications,
      report_alerts,
      weekly_digest,
      auto_verify,
      min_confidence_score
    FROM moderator_settings
    WHERE user_id = $1`,
    [userId]
  );

  if (existing) {
    return mapDbRowToSettings(existing);
  }

  return upsertSettings(userId, DEFAULT_SETTINGS);
}

async function saveSettingsForUser(userId, payload) {
  const validatedSettings = validateSettingsPayload(payload);
  return upsertSettings(userId, validatedSettings);
}

async function resetSettingsForUser(userId) {
  return upsertSettings(userId, DEFAULT_SETTINGS);
}

async function getAutoVerificationPolicy() {
  await ensureSettingsTable();

  const row = await db.one(
    `SELECT
      COALESCE(BOOL_OR(ms.auto_verify), FALSE) AS enabled,
      COALESCE(
        MAX(ms.min_confidence_score) FILTER (WHERE ms.auto_verify = TRUE),
        $1
      ) AS min_confidence_score
    FROM users u
    LEFT JOIN moderator_settings ms ON ms.user_id = u.user_id
    WHERE u.role IN ('moderator', 'admin')`,
    [DEFAULT_SETTINGS.minConfidenceScore]
  );

  return {
    enabled: Boolean(row.enabled),
    minConfidenceScore: parseInt(row.min_confidence_score, 10),
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettingsForUser,
  saveSettingsForUser,
  resetSettingsForUser,
  getAutoVerificationPolicy,
  ensureSettingsStorage: ensureSettingsTable,
};
