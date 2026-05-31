const db = require('../config/database');
const logger = require('../utils/logger');
const constellationSynthesis = require('../services/constellationSynthesis');

const SYNTHESIS_SWEEP_LIMIT = 100;
const SYNTHESIS_INTERVAL_MS = 5 * 60 * 1000;
const LOCATION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MEDIA_STALE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MEDIA_JUDGMENT_STALE_MINUTES = 10;

let started = false;

async function markExpiredConstellations() {
  const result = await db.result(
    `UPDATE incident_constellations
     SET status = 'expired',
         updated_at = NOW()
     WHERE status = 'active'
       AND expires_at <= NOW()`
  );

  return result.rowCount;
}

async function runPendingConstellationSynthesis(limit = SYNTHESIS_SWEEP_LIMIT) {
  const rows = await db.manyOrNone(
    `SELECT constellation_id
     FROM incident_constellations
     WHERE status = 'active'
       AND expires_at > NOW()
       AND has_unprocessed_changes = TRUE
     ORDER BY updated_at ASC
     LIMIT $1`,
    [limit]
  );

  let synthesized = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await constellationSynthesis.triggerSynthesis(row.constellation_id);
      synthesized += 1;
    } catch (error) {
      failed += 1;
      logger.error(`Pending constellation synthesis failed for ${row.constellation_id}: ${error.message}`);
    }
  }

  return {
    scanned: rows.length,
    synthesized,
    failed,
  };
}

async function clearStaleMediaJudgments() {
  const result = await db.result(
    `UPDATE report_ml
     SET media_judgment_status = 'failed',
         media_judgment_error = 'Media analysis timed out',
         media_judgment_generated_at = NOW()
     WHERE media_judgment_status = 'pending'
       AND media_judgment_pending_at < NOW() - INTERVAL '${MEDIA_JUDGMENT_STALE_MINUTES} minutes'`
  );
  return result.rowCount;
}

async function clearStaleUserLocations() {
  const result = await db.result(
    `UPDATE users
     SET last_known_latitude = NULL,
         last_known_longitude = NULL,
         location_updated_at = NULL,
         updated_at = NOW()
     WHERE location_updated_at < NOW() - INTERVAL '30 days'`
  );

  return result.rowCount;
}

async function runConstellationMaintenance() {
  const expired = await markExpiredConstellations();
  const synthesis = await runPendingConstellationSynthesis();

  return {
    expired,
    synthesis,
  };
}

function runSafely(name, task) {
  task().catch((error) => {
    logger.error(`${name} failed: ${error.message}`);
  });
}

function startConstellationMaintenance() {
  if (started) {
    return false;
  }

  started = true;

  // Assumes a single backend instance. Add database locking before horizontal scale.
  runSafely('Constellation maintenance', runConstellationMaintenance);
  runSafely('Stale user location cleanup', clearStaleUserLocations);
  runSafely('Stale media judgment cleanup', clearStaleMediaJudgments);

  const synthesisInterval = setInterval(() => {
    runSafely('Constellation maintenance', runConstellationMaintenance);
  }, SYNTHESIS_INTERVAL_MS);

  const cleanupInterval = setInterval(() => {
    runSafely('Stale user location cleanup', clearStaleUserLocations);
  }, LOCATION_CLEANUP_INTERVAL_MS);

  const mediaStaleInterval = setInterval(() => {
    runSafely('Stale media judgment cleanup', clearStaleMediaJudgments);
  }, MEDIA_STALE_SWEEP_INTERVAL_MS);

  if (typeof synthesisInterval.unref === 'function') {
    synthesisInterval.unref();
  }

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  if (typeof mediaStaleInterval.unref === 'function') {
    mediaStaleInterval.unref();
  }

  logger.info('Constellation maintenance scheduler started');
  return true;
}

module.exports = {
  markExpiredConstellations,
  runPendingConstellationSynthesis,
  clearStaleUserLocations,
  startConstellationMaintenance,
};
