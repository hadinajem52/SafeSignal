const db = require('../../config/database');

async function addIncidentIdempotency() {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
    ADD COLUMN IF NOT EXISTS idempotency_payload_hash VARCHAR(64);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_idempotency
    ON incidents (reporter_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
  `);
}

if (require.main === module) {
  addIncidentIdempotency()
    .then(() => {
      console.log('Incident idempotency migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Incident idempotency migration failed:', error);
      process.exit(1);
    });
}

module.exports = addIncidentIdempotency;
