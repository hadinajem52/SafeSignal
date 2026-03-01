const db = require('../../config/database');
const { PUBLIC_INCIDENT_STATUSES } = require('../../../../constants/incident');

const runMigration = async () => {
  await db.none(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS is_disclosed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_location_fuzzed BOOLEAN DEFAULT FALSE;
  `);

  await db.none(
    `UPDATE incidents
     SET is_disclosed = TRUE,
         is_location_fuzzed = TRUE
     WHERE is_draft = FALSE
       AND status = ANY($1::text[])`,
    [PUBLIC_INCIDENT_STATUSES]
  );
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
