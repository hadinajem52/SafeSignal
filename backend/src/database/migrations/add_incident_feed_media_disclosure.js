const db = require('../../config/database');

const runMigration = async () => {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS is_media_disclosed BOOLEAN DEFAULT FALSE;
  `);

  await db.none(`
    UPDATE incidents
    SET is_media_disclosed = FALSE
    WHERE is_media_disclosed IS NULL;
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_incident_feed_media_disclosure completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_incident_feed_media_disclosure failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
