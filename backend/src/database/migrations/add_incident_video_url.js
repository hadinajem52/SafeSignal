const db = require('../../config/database');

const runMigration = async () => {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS video_url TEXT;
  `);

  await db.none(`
    ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS video_url TEXT;
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_incident_video_url completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_incident_video_url failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
