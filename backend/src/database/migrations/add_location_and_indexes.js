const db = require('../../config/database');

const runMigration = async () => {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);
  `);

  await db.none(`
    UPDATE incidents
    SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;
  `);

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_incidents_location_geo ON incidents USING GIST (location);
    CREATE INDEX IF NOT EXISTS idx_incidents_dashboard ON incidents (is_draft, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_map ON incidents (status, incident_date DESC) WHERE is_draft = FALSE;
    CREATE INDEX IF NOT EXISTS idx_incidents_user_reports ON incidents (reporter_id, is_draft, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents (category);
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_location_and_indexes completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_location_and_indexes failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;