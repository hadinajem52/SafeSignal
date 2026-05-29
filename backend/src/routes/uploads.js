const express = require('express');
const path = require('path');
const optionalAuth = require('../middleware/optionalAuth');
const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const { UPLOAD_ROOT } = require('../middleware/incidentUpload');

const STAFF_ROLES = new Set(['admin', 'moderator', 'law_enforcement']);
const PUBLIC_MEDIA_STATUSES = new Set(['police_closed', 'resolved', 'published']);
const router = express.Router();

function canReadIncidentMedia(incident, user) {
  if (
    incident.is_disclosed &&
    incident.closure_outcome &&
    PUBLIC_MEDIA_STATUSES.has(incident.status)
  ) {
    return true;
  }

  if (!user) return false;
  if (STAFF_ROLES.has(user.role)) return true;
  return incident.reporter_id === user.userId;
}

async function getIncidentForMedia(mediaPath) {
  return db.oneOrNone(
    `SELECT incident_id, reporter_id, status, is_disclosed, closure_outcome
     FROM incidents
     WHERE video_url = $1
        OR $1 = ANY(COALESCE(photo_urls, ARRAY[]::text[]))
     LIMIT 1`,
    [mediaPath]
  );
}

router.get('/incidents/:filename', optionalAuth, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const mediaPath = `/uploads/incidents/${filename}`;
    const incident = await getIncidentForMedia(mediaPath);

    if (!incident) {
      throw ServiceError.notFound('Media');
    }

    if (!canReadIncidentMedia(incident, req.user)) {
      throw ServiceError.forbidden('Not authorized to access this media');
    }

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(path.join(UPLOAD_ROOT, 'incidents', filename));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
