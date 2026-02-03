const db = require('../../config/database');

async function migrate() {
  try {
    console.log('Migrating: Adding incident_comments table...');

    // Create incident_comments table
    await db.none(`
      CREATE TABLE IF NOT EXISTS incident_comments (
        comment_id SERIAL PRIMARY KEY,
        incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_internal BOOLEAN NOT NULL DEFAULT false,
        attachments TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for performance
    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_incident_comments_incident_id 
      ON incident_comments(incident_id, created_at ASC);
    `);

    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_incident_comments_user_id 
      ON incident_comments(user_id);
    `);

    // Add index for filtering internal vs public comments
    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_incident_comments_visibility 
      ON incident_comments(incident_id, is_internal, created_at ASC);
    `);

    console.log('✓ Migration successful: incident_comments table created.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate();
