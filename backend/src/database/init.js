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
        role VARCHAR(50) DEFAULT 'citizen' CHECK (role IN ('citizen', 'moderator', 'admin', 'law_enforcement')),
        is_verified BOOLEAN DEFAULT FALSE,
        is_suspended BOOLEAN DEFAULT FALSE,
        verification_code VARCHAR(6),
        verification_code_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure role constraint is updated for existing tables
    await db.none(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);

    await db.none(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('citizen', 'moderator', 'admin', 'law_enforcement'));
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
        location GEOGRAPHY(Point, 4326),
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
        )),
        closure_outcome VARCHAR(50) CHECK (closure_outcome IN (
          'resolved_handled',
          'arrest_made',
          'false_alarm',
          'report_filed'
        )),
        closure_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure status and closure constraints are updated for existing tables
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

    await db.none(`
      UPDATE incidents
      SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;
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

    // Ensure action_type constraint is updated for existing tables
    await db.none(`
      ALTER TABLE report_actions
      DROP CONSTRAINT IF EXISTS report_actions_action_type_check;
    `);

    await db.none(`
      ALTER TABLE report_actions
      ADD CONSTRAINT report_actions_action_type_check CHECK (action_type IN (
        'created',
        'status_changed',
        'verified',
        'rejected',
        'flagged',
        'merged',
        'published',
        'archived',
        'needs_info'
      ));
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
      CREATE INDEX IF NOT EXISTS idx_incidents_location_geo ON incidents USING GIST (location);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
      CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at);
      CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents (reporter_id);
      CREATE INDEX IF NOT EXISTS idx_incidents_dashboard ON incidents (is_draft, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_map ON incidents (status, incident_date DESC) WHERE is_draft = FALSE;
      CREATE INDEX IF NOT EXISTS idx_incidents_user_reports ON incidents (reporter_id, is_draft, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents (category);
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
