const db = require('../../config/database');

async function migrate() {
  try {
    console.log('Migrating: Adding LEI support...');

    await db.none(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);

    await db.none(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('citizen', 'moderator', 'admin', 'law_enforcement'));
    `);

    await db.none(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS closure_outcome VARCHAR(50);
    `);

    await db.none(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS closure_details JSONB;
    `);

    await db.none(`
      ALTER TABLE incidents
      DROP CONSTRAINT IF EXISTS incidents_status_check;
    `);

    await db.none(`
      ALTER TABLE incidents
      ADD CONSTRAINT incidents_status_check CHECK (status IN (
        'submitted',
        'auto_processed',
        'in_review',
        'verified',
        'dispatched',
        'on_scene',
        'investigating',
        'police_closed',
        'rejected',
        'needs_info',
        'published',
        'resolved',
        'archived',
        'auto_flagged',
        'merged'
      ));
    `);

    await db.none(`
      ALTER TABLE incidents
      DROP CONSTRAINT IF EXISTS incidents_closure_outcome_check;
    `);

    await db.none(`
      ALTER TABLE incidents
      ADD CONSTRAINT incidents_closure_outcome_check CHECK (
        closure_outcome IS NULL OR closure_outcome IN (
          'resolved_handled',
          'arrest_made',
          'false_alarm',
          'report_filed'
        )
      );
    `);

    console.log('✓ Migration successful: LEI support added.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
