const db = require('../../config/database');

async function runMigration() {
  await db.none(`
    ALTER TABLE report_ml
    ADD COLUMN IF NOT EXISTS media_judgment_status VARCHAR(30)
      CHECK (
        media_judgment_status IS NULL OR media_judgment_status IN (
          'pending',
          'completed',
          'failed',
          'unsupported',
          'skipped'
        )
      ),
    ADD COLUMN IF NOT EXISTS media_judgment JSONB,
    ADD COLUMN IF NOT EXISTS media_judgment_error TEXT,
    ADD COLUMN IF NOT EXISTS media_judgment_input_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS media_judgment_generated_at TIMESTAMP;
  `);

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_report_ml_media_judgment_status
    ON report_ml (media_judgment_status)
    WHERE media_judgment_status IS NOT NULL;
  `);
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_report_media_judgment completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_report_media_judgment failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
