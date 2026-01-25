const db = require('../config/database');

const resetDatabase = async () => {
  try {
    console.log('⚠️  Resetting SafeSignal database...');

    // Drop tables in reverse order of creation (respecting foreign keys)
    await db.none(`
      DROP TABLE IF EXISTS moderation_queue CASCADE;
      DROP TABLE IF EXISTS reports CASCADE;
      DROP TABLE IF EXISTS incidents CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('✓ Database reset successfully');
    console.log('Now run: npm run db:init');
  } catch (error) {
    console.error('✗ Error resetting database:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  resetDatabase().then(() => process.exit(0));
}

module.exports = resetDatabase;
