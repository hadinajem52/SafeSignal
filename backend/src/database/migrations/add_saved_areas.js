const db = require('../../config/database');

const runMigration = async () => {
  await db.none(`
    CREATE TABLE IF NOT EXISTS saved_areas (
      area_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      label VARCHAR(100) NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      radius_km DECIMAL(5, 2) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_saved_areas_user ON saved_areas (user_id, created_at DESC);
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_saved_areas completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_saved_areas failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
