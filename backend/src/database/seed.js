const bcrypt = require('bcryptjs');
const db = require('../config/database');

const seedDatabase = async () => {
  try {
    console.log('Seeding SafeSignal database with test accounts...');

    // Admin account
    const adminEmail = 'admin@safesignal.com';
    const adminPassword = 'password123';
    const adminUsername = 'admin';

    // Moderator account
    const modEmail = 'moderator@safesignal.com';
    const modPassword = 'password123';
    const modUsername = 'moderator';

    // Law enforcement account
    const leiEmail = 'lei@safesignal.com';
    const leiPassword = 'password123';
    const leiUsername = 'law_enforcement';

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

    // Check if law enforcement account already exists
    const existingLei = await db.oneOrNone(
      'SELECT user_id FROM users WHERE email = $1',
      [leiEmail]
    );

    if (!existingLei) {
      const salt = await bcrypt.genSalt(12);
      const leiHash = await bcrypt.hash(leiPassword, salt);

      await db.one(
        `INSERT INTO users (username, email, password_hash, role, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, 'law_enforcement', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING user_id, email, role`,
        [leiUsername, leiEmail, leiHash]
      );

      console.log(`✓ Created law enforcement account: ${leiEmail} / ${leiPassword}`);
    } else {
      console.log(`ℹ Law enforcement account already exists: ${leiEmail}`);
    }

    console.log('\n📝 Test Credentials:');
    console.log('═══════════════════════════════════════');
    console.log(`Admin Account:\n  Email: ${adminEmail}\n  Password: ${adminPassword}`);
    console.log(`Moderator Account:\n  Email: ${modEmail}\n  Password: ${modPassword}`);
    console.log(`Law Enforcement Account:\n  Email: ${leiEmail}\n  Password: ${leiPassword}`);
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
