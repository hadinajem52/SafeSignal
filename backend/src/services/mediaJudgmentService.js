const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const logger = require('../utils/logger');
const mlClient = require('../utils/mlClient');
const { UPLOAD_ROOT } = require('../middleware/incidentUpload');

const INCIDENT_MEDIA_PREFIX = '/uploads/incidents/';
const INCIDENT_MEDIA_DIR = path.resolve(UPLOAD_ROOT, 'incidents');
const TERMINAL_STATUSES = new Set(['completed', 'unsupported', 'skipped']);

function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.webm': 'video/webm',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

function toIncidentPayload(incident) {
  return {
    incidentId: incident.incident_id,
    title: incident.title,
    description: incident.description,
    category: incident.category,
    severity: incident.severity,
  };
}

function getMediaUrls(incident) {
  return [
    ...(Array.isArray(incident.photo_urls) ? incident.photo_urls : []),
    incident.video_url,
  ].filter(Boolean);
}

function resolveStoredMedia(url, role, index) {
  if (typeof url !== 'string' || !url.startsWith(INCIDENT_MEDIA_PREFIX)) {
    return { error: `Unsupported media URL for analysis: ${url || '(empty)'}` };
  }

  const originalName = path.basename(url);
  const absolutePath = path.resolve(INCIDENT_MEDIA_DIR, originalName);
  if (!absolutePath.startsWith(`${INCIDENT_MEDIA_DIR}${path.sep}`)) {
    return { error: `Unsafe media path for analysis: ${url}` };
  }

  let stats;
  try {
    stats = fs.statSync(absolutePath);
  } catch {
    return { error: `Stored media file is missing: ${url}` };
  }

  if (!stats.isFile()) {
    return { error: `Stored media path is not a file: ${url}` };
  }

  const mimeType = getMimeType(originalName);
  return {
    mediaFile: {
      role,
      url,
      path: absolutePath,
      filename: `${role}-${index + 1}-${originalName}`,
      mimeType,
      kind: mimeType.startsWith('video/') ? 'video' : 'photo',
      size: stats.size,
    },
  };
}

function getStoredMediaResolution(incident, role) {
  return getMediaUrls(incident).reduce(
    (result, url, index) => {
      const resolved = resolveStoredMedia(url, role, index);
      if (resolved.error) {
        result.errors.push(resolved.error);
      } else {
        result.files.push(resolved.mediaFile);
      }
      return result;
    },
    { files: [], errors: [] }
  );
}

function toMediaManifest(mediaFiles) {
  return mediaFiles.map(({ role, url, filename, mimeType, kind }) => ({
    role,
    url,
    filename,
    mimeType,
    kind,
  }));
}

function buildInputHash(metadata) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(metadata))
    .digest('hex');
}

function buildInsufficientMediaJudgment() {
  return {
    overallVerdict: 'insufficient_media',
    validityRecommendation: 'needs_review',
    confidence: 0,
    descriptionAlignment: {
      matchedDetails: [],
      missingDetails: [],
      contradictions: [],
      reasoning: 'No submitted photos or video were available for media analysis.',
    },
    duplicateMediaAlignment: {
      alignment: 'not_applicable',
      confidence: 0,
      reasoning: 'No duplicate media comparison was run.',
    },
    evidenceSummary: {
      photoCount: 0,
      videoPresent: false,
      observedScene: null,
      limitations: ['No submitted media.'],
    },
  };
}

async function getLatestMlContext(incidentId) {
  return db.oneOrNone(
    `SELECT
       i.incident_id,
       i.title,
       i.description,
       i.category,
       i.severity,
       i.photo_urls,
       i.video_url,
       r.report_id,
       rm.ml_id,
       rm.media_judgment_status,
       rm.media_judgment,
       rm.media_judgment_error,
       rm.media_judgment_input_hash,
       rm.media_judgment_generated_at
     FROM incidents i
     LEFT JOIN LATERAL (
       SELECT report_id
       FROM reports
       WHERE incident_id = i.incident_id
       ORDER BY created_at DESC
       LIMIT 1
     ) r ON TRUE
     LEFT JOIN LATERAL (
       SELECT *
       FROM report_ml
       WHERE report_id = r.report_id
       ORDER BY created_at DESC
       LIMIT 1
     ) rm ON TRUE
     WHERE i.incident_id = $1`,
    [incidentId]
  );
}

async function getDuplicateComparisonIncidentForReport(reportId) {
  if (!reportId) return null;

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
     ),
     comparison_incidents AS (
       SELECT ci.*, 'canonical_original' AS comparison_role, 0 AS comparison_priority, pc.depth, cr.created_at AS linked_at
       FROM parent_chain pc
       JOIN reports cr ON cr.report_id = pc.report_id
       JOIN incidents ci ON ci.incident_id = cr.incident_id
       UNION ALL
       SELECT di.*, 'linked_duplicate' AS comparison_role, 1 AS comparison_priority, 1 AS depth, dr.created_at AS linked_at
       FROM report_links rl
       JOIN reports dr ON dr.report_id = rl.duplicate_report_id
       JOIN incidents di ON di.incident_id = dr.incident_id
       WHERE rl.canonical_report_id = $1
         AND rl.link_type = 'duplicate'
     )
     SELECT *
     FROM comparison_incidents
     ORDER BY comparison_priority ASC, depth DESC, linked_at DESC
     LIMIT 1`,
    [reportId]
  );
}

async function markPending(mlId, inputHash) {
  await db.none(
    `UPDATE report_ml
     SET media_judgment_status = 'pending',
         media_judgment = NULL,
         media_judgment_error = NULL,
         media_judgment_input_hash = $2,
         media_judgment_generated_at = NULL,
         media_judgment_pending_at = CURRENT_TIMESTAMP
     WHERE ml_id = $1`,
    [mlId, inputHash]
  );
}

async function markTerminal(mlId, status, judgment, error = null) {
  const row = await db.one(
    `UPDATE report_ml
     SET media_judgment_status = $2,
         media_judgment = $3,
         media_judgment_error = $4,
         media_judgment_generated_at = CURRENT_TIMESTAMP
     WHERE ml_id = $1
     RETURNING media_judgment_status, media_judgment, media_judgment_error, media_judgment_generated_at`,
    [mlId, status, judgment || null, error]
  );

  return {
    status: row.media_judgment_status,
    judgment: row.media_judgment,
    error: row.media_judgment_error,
    generatedAt: row.media_judgment_generated_at,
  };
}

function buildAnalysisPayload(incident, reportMedia, duplicateIncident, duplicateMedia) {
  return {
    report: toIncidentPayload(incident),
    media: toMediaManifest(reportMedia),
    duplicate: duplicateIncident
      ? {
          relationship: duplicateIncident.comparison_role || 'linked_duplicate',
          report: toIncidentPayload(duplicateIncident),
          media: toMediaManifest(duplicateMedia),
        }
      : null,
  };
}

async function analyzeIncidentMedia(incidentId, { force = false } = {}) {
  const context = await getLatestMlContext(incidentId);
  if (!context) {
    throw ServiceError.notFound('Incident');
  }

  if (!context.ml_id) {
    throw ServiceError.notFound('No ML record found for this incident');
  }

  const duplicateIncident = await getDuplicateComparisonIncidentForReport(context.report_id);
  const reportMediaResolution = getStoredMediaResolution(context, 'report');
  const duplicateMediaRole = duplicateIncident?.comparison_role || 'linked_duplicate';
  const duplicateMediaResolution = duplicateIncident
    ? getStoredMediaResolution(duplicateIncident, duplicateMediaRole)
    : { files: [], errors: [] };
  const reportMedia = reportMediaResolution.files;
  const duplicateMedia = duplicateMediaResolution.files;
  const mediaErrors = reportMedia.length > 0
    ? [...reportMediaResolution.errors, ...duplicateMediaResolution.errors]
    : reportMediaResolution.errors;
  const metadata = buildAnalysisPayload(context, reportMedia, duplicateIncident, duplicateMedia);
  const inputHash = buildInputHash({ ...metadata, mediaErrors });

  if (
    !force
    && context.media_judgment_input_hash === inputHash
    && TERMINAL_STATUSES.has(context.media_judgment_status)
  ) {
    return {
      status: context.media_judgment_status,
      judgment: context.media_judgment,
      error: context.media_judgment_error,
      generatedAt: context.media_judgment_generated_at,
    };
  }

  if (reportMedia.length === 0) {
    await markPending(context.ml_id, inputHash);
    if (reportMediaResolution.errors.length > 0) {
      return markTerminal(context.ml_id, 'failed', null, reportMediaResolution.errors.join('; '));
    }
    return markTerminal(context.ml_id, 'skipped', buildInsufficientMediaJudgment());
  }

  if (mediaErrors.length > 0) {
    await markPending(context.ml_id, inputHash);
    return markTerminal(context.ml_id, 'failed', null, mediaErrors.join('; '));
  }

  await markPending(context.ml_id, inputHash);

  const mlResult = await mlClient.analyzeReportMedia({
    metadata,
    mediaFiles: [...reportMedia, ...duplicateMedia],
  });

  if (!mlResult) {
    return markTerminal(context.ml_id, 'failed', null, 'ML media analysis unavailable');
  }

  if (mlResult.supported === false || mlResult.status === 'unsupported') {
    return markTerminal(
      context.ml_id,
      'unsupported',
      null,
      mlResult.error || 'Current ML provider does not support media analysis'
    );
  }

  if (mlResult.status !== 'completed' || !mlResult.judgment) {
    return markTerminal(
      context.ml_id,
      'failed',
      null,
      mlResult.error || 'ML media analysis returned no judgment'
    );
  }

  return markTerminal(context.ml_id, 'completed', mlResult.judgment);
}

function queueIncidentMediaAnalysis(incidentId, options = {}) {
  Promise.resolve()
    .then(() => analyzeIncidentMedia(incidentId, options))
    .catch((error) => {
      logger.warn(`Media judgment failed for incident ${incidentId}: ${error.message}`);
    });
}

module.exports = {
  analyzeIncidentMedia,
  queueIncidentMediaAnalysis,
};
