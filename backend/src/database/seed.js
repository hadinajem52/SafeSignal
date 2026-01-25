const bcrypt = require('bcryptjs');
const db = require('../config/database');

const seedDatabase = async () => {
  try {
    console.log('Seeding SafeSignal database with test accounts...');

    // Admin account
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin123!';
    const adminUsername = 'admin';

    // Moderator account
    const modEmail = 'mod@example.com';
    const modPassword = 'Moderator123!';
    const modUsername = 'mod';

    // Check if admin already exists
    const existingAdmin = await db.oneOrNone(
      'SELECT user_id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(12);
      const adminHash = await bcrypt.hash(adminPassword, salt);

      await db.one(
        `INSERT INTO users (username, email, password_hash, role, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, 'admin', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING user_id, email, role`,
        [adminUsername, adminEmail, adminHash]
      );

      console.log(`✓ Created admin account: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log(`ℹ Admin account already exists: ${adminEmail}`);
    }

    // Check if moderator already exists
    const existingMod = await db.oneOrNone(
      'SELECT user_id FROM users WHERE email = $1',
      [modEmail]
    );

    if (!existingMod) {
      const salt = await bcrypt.genSalt(12);
      const modHash = await bcrypt.hash(modPassword, salt);

      await db.one(
        `INSERT INTO users (username, email, password_hash, role, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, 'moderator', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING user_id, email, role`,
        [modUsername, modEmail, modHash]
      );

      console.log(`✓ Created moderator account: ${modEmail} / ${modPassword}`);
    } else {
      console.log(`ℹ Moderator account already exists: ${modEmail}`);
    }

    console.log('\n📝 Test Credentials:');
    console.log('═══════════════════════════════════════');
    console.log(`Admin Account:\n  Email: ${adminEmail}\n  Password: ${adminPassword}`);
    console.log(`Moderator Account:\n  Email: ${modEmail}\n  Password: ${modPassword}`);
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('✗ Error seeding database:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
