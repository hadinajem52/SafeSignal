const db = require('../config/database');
const seedDatabase = require('./seed');
const pgp = require('pg-promise')({ capSQL: true });

const initDatabase = async () => {
  try {
    console.log('Initializing SafeSignal database schema...');

    // Enable PostGIS extension for spatial functionality (already created via psql)
    console.log('✓ PostGIS extension already enabled');

    // Create Users table
    await db.none(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        role VARCHAR(50) DEFAULT 'citizen' CHECK (role IN ('citizen', 'moderator', 'admin')),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_code VARCHAR(6),
        verification_code_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Incidents table with proper status workflow
    await db.none(`
      CREATE TABLE IF NOT EXISTS incidents (
        incident_id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        location_name VARCHAR(500),
        incident_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        is_anonymous BOOLEAN DEFAULT FALSE,
        is_draft BOOLEAN DEFAULT FALSE,
        photo_urls TEXT[],
        status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
          'submitted',
          'auto_processed',
          'in_review',
          'verified',
          'rejected',
          'needs_info',
          'published',
          'resolved',
          'archived',
          'auto_flagged',
          'merged'
        )),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Reports table
    await db.none(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id SERIAL PRIMARY KEY,
        incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
        photo_urls TEXT[],
        metadata JSONB,
        ml_confidence_score DECIMAL(3, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Moderation_Queue table
    await db.none(`
      CREATE TABLE IF NOT EXISTS moderation_queue (
        queue_id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
        moderator_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
        reviewed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Report_Actions table for audit trail
    await db.none(`
      CREATE TABLE IF NOT EXISTS report_actions (
        action_id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES reports(report_id) ON DELETE CASCADE,
        incident_id INTEGER REFERENCES incidents(incident_id) ON DELETE CASCADE,
        moderator_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
          'created',
          'status_changed',
          'verified',
          'rejected',
          'flagged',
          'merged',
          'published',
          'archived',
          'needs_info'
        )),
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Report_Links table for duplicate management
    await db.none(`
      CREATE TABLE IF NOT EXISTS report_links (
        link_id SERIAL PRIMARY KEY,
        canonical_report_id INTEGER NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
        duplicate_report_id INTEGER NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
        link_type VARCHAR(50) DEFAULT 'duplicate' CHECK (link_type IN ('duplicate', 'related', 'merged')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(canonical_report_id, duplicate_report_id)
      );
    `);

    // Create Report_ML table for ML outputs
    await db.none(`
      CREATE TABLE IF NOT EXISTS report_ml (
        ml_id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
        predicted_category VARCHAR(100),
        confidence DECIMAL(3, 2),
        dedup_candidates JSONB,
        risk_score DECIMAL(3, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents (latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
      CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at);
      CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents (reporter_id);
      CREATE INDEX IF NOT EXISTS idx_reports_incident_id ON reports (incident_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue (status);
      CREATE INDEX IF NOT EXISTS idx_report_actions_incident ON report_actions (incident_id);
      CREATE INDEX IF NOT EXISTS idx_report_actions_timestamp ON report_actions (timestamp);
      CREATE INDEX IF NOT EXISTS idx_report_ml_report ON report_ml (report_id);
    `);

    console.log('✓ Database schema initialized successfully');

    // Seed test accounts
    await seedDatabase();
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  initDatabase().then(() => process.exit(0));
}

module.exports = initDatabase;
