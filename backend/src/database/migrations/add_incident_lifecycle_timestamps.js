const db = require('../../config/database');

async function addIncidentLifecycleTimestamps() {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS first_action_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS on_scene_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

    CREATE INDEX IF NOT EXISTS idx_incidents_first_action_at ON incidents (first_action_at);
    CREATE INDEX IF NOT EXISTS idx_incidents_closed_at ON incidents (closed_at);
  `);

  await db.none(`
    WITH first_actions AS (
      SELECT incident_id, MIN(timestamp) AS first_action_at
      FROM report_actions
      WHERE action_type IN ('verified', 'rejected', 'flagged', 'merged', 'published', 'archived', 'needs_info', 'status_changed')
      GROUP BY incident_id
    ),
    verified_actions AS (
      SELECT incident_id, MIN(timestamp) AS verified_at
      FROM report_actions
      WHERE action_type = 'verified'
      GROUP BY incident_id
    ),
    rejected_actions AS (
      SELECT incident_id, MIN(timestamp) AS rejected_at
      FROM report_actions
      WHERE action_type = 'rejected'
      GROUP BY incident_id
    )
    UPDATE incidents i
    SET first_action_at = COALESCE(i.first_action_at, fa.first_action_at),
        verified_at = COALESCE(i.verified_at, va.verified_at),
        rejected_at = COALESCE(i.rejected_at, ra.rejected_at)
    FROM first_actions fa
    LEFT JOIN verified_actions va ON va.incident_id = fa.incident_id
    LEFT JOIN rejected_actions ra ON ra.incident_id = fa.incident_id
    WHERE i.incident_id = fa.incident_id;
  `);
}

if (require.main === module) {
  addIncidentLifecycleTimestamps()
    .then(() => {
      console.log('Incident lifecycle timestamp migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Incident lifecycle timestamp migration failed:', error);
      process.exit(1);
    });
}

module.exports = addIncidentLifecycleTimestamps;
