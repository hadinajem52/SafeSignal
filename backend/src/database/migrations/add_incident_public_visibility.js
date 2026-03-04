const db = require('../../config/database');

const runMigration = async () => {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS is_disclosed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_location_fuzzed BOOLEAN DEFAULT FALSE;
  `);

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_incidents_feed
      ON incidents (is_disclosed, status, updated_at DESC)
      WHERE is_disclosed = TRUE;
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_incident_public_visibility completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_incident_public_visibility failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
