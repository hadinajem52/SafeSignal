const db = require('../../config/database');

async function migrate() {
  try {
    console.log('Migrating: Adding moderator_settings table...');

    await db.none(`
      CREATE TABLE IF NOT EXISTS moderator_settings (
        settings_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
        email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        report_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
        auto_verify BOOLEAN NOT NULL DEFAULT FALSE,
        min_confidence_score INTEGER NOT NULL DEFAULT 80 CHECK (min_confidence_score BETWEEN 0 AND 100),
        last_weekly_digest_sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.none(`
      ALTER TABLE moderator_settings
      ADD COLUMN IF NOT EXISTS last_weekly_digest_sent_at TIMESTAMP;
    `);

    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id
      ON moderator_settings(user_id);
    `);

    console.log('✓ Migration successful: moderator_settings table created.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate();
