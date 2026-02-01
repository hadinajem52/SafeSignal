const db = require('../../config/database');

async function migrate() {
  try {
    console.log('Migrating: Adding is_suspended column to users table...');
    
    await db.none(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('✓ Migration successful: is_suspended column added.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // We don't close the pool immediately if we want to query, but for a script it's fine.
    // However, pg-promise's default pool handling is usually auto. 
    // If db.end() is needed depends on config/database.js implementation.
  }
}

migrate();
