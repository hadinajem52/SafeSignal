const db = require('../../config/database');

async function runMigration() {
  await db.none(`
    ALTER TABLE report_ml
    ADD COLUMN IF NOT EXISTS media_judgment_pending_at TIMESTAMP;
  `);
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_media_judgment_pending_at completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_media_judgment_pending_at failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
