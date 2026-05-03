const db = require('../../config/database');

const runMigration = async () => {
  await db.none('CREATE EXTENSION IF NOT EXISTS postgis;');

  await db.none(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS push_token TEXT,
    ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_known_latitude DECIMAL(6, 2),
    ADD COLUMN IF NOT EXISTS last_known_longitude DECIMAL(7, 2),
    ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_consent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;
  `);

  await db.none(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_location_coordinates_pair_check,
    ADD CONSTRAINT users_location_coordinates_pair_check CHECK (
      (last_known_latitude IS NULL AND last_known_longitude IS NULL)
      OR (last_known_latitude IS NOT NULL AND last_known_longitude IS NOT NULL)
    );
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS incident_constellations (
      constellation_id SERIAL PRIMARY KEY,
      incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'active',
      center_latitude DECIMAL(10, 8) NOT NULL,
      center_longitude DECIMAL(11, 8) NOT NULL,
      radius_meters INTEGER NOT NULL DEFAULT 500,
      opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      confidence_state VARCHAR(30) DEFAULT 'single_report',
      confidence_score DECIMAL(4, 3) DEFAULT 0.0,
      summary TEXT,
      supporting_signals INTEGER DEFAULT 0,
      contradicting_signals INTEGER DEFAULT 0,
      has_unprocessed_changes BOOLEAN DEFAULT FALSE,
      ongoing_assessment VARCHAR(20) DEFAULT 'unknown',
      last_synthesized_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.none(`
    ALTER TABLE incident_constellations
    DROP CONSTRAINT IF EXISTS incident_constellations_status_check,
    DROP CONSTRAINT IF EXISTS incident_constellations_radius_meters_check,
    DROP CONSTRAINT IF EXISTS incident_constellations_confidence_state_check,
    DROP CONSTRAINT IF EXISTS incident_constellations_confidence_score_check,
    DROP CONSTRAINT IF EXISTS incident_constellations_supporting_signals_check,
    DROP CONSTRAINT IF EXISTS incident_constellations_contradicting_signals_check,
    DROP CONSTRAINT IF EXISTS incident_constellations_ongoing_assessment_check,
    ADD CONSTRAINT incident_constellations_status_check
      CHECK (status IN ('active', 'expired', 'flagged')),
    ADD CONSTRAINT incident_constellations_radius_meters_check
      CHECK (radius_meters > 0),
    ADD CONSTRAINT incident_constellations_confidence_state_check
      CHECK (confidence_state IN (
        'single_report',
        'corroborated',
        'mixed_signals',
        'activity_not_confirmed',
        'likely_ended'
      )),
    ADD CONSTRAINT incident_constellations_confidence_score_check
      CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    ADD CONSTRAINT incident_constellations_supporting_signals_check
      CHECK (supporting_signals >= 0),
    ADD CONSTRAINT incident_constellations_contradicting_signals_check
      CHECK (contradicting_signals >= 0),
    ADD CONSTRAINT incident_constellations_ongoing_assessment_check
      CHECK (ongoing_assessment IN ('ongoing', 'likely_ended', 'unknown', 'unclear'));
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS incident_corroborations (
      corroboration_id SERIAL PRIMARY KEY,
      constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      signal_type VARCHAR(30) NOT NULL,
      note TEXT,
      note_flagged_pii BOOLEAN DEFAULT FALSE,
      distance_meters INTEGER,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      device_latitude_rounded DECIMAL(6, 2),
      device_longitude_rounded DECIMAL(7, 2),
      CONSTRAINT incident_corroborations_constellation_user_unique UNIQUE (constellation_id, user_id)
    );
  `);

  await db.none(`
    ALTER TABLE incident_corroborations
    DROP CONSTRAINT IF EXISTS incident_corroborations_constellation_user_unique,
    DROP CONSTRAINT IF EXISTS incident_corroborations_signal_type_check,
    DROP CONSTRAINT IF EXISTS incident_corroborations_distance_meters_check,
    ADD CONSTRAINT incident_corroborations_constellation_user_unique
      UNIQUE (constellation_id, user_id),
    ADD CONSTRAINT incident_corroborations_signal_type_check
      CHECK (signal_type IN (
        'saw_something',
        'heard_something',
        'nothing_unusual',
        'not_sure',
        'already_left'
      )),
    ADD CONSTRAINT incident_corroborations_distance_meters_check
      CHECK (distance_meters IS NULL OR distance_meters >= 0);
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS constellation_cluster_links (
      id SERIAL PRIMARY KEY,
      constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
      linked_constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT constellation_cluster_links_unique UNIQUE (constellation_id, linked_constellation_id),
      CONSTRAINT constellation_cluster_links_order_check CHECK (constellation_id < linked_constellation_id)
    );
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS witness_prompt_deliveries (
      delivery_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      suppression_reason VARCHAR(50),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT witness_prompt_deliveries_unique UNIQUE (user_id, constellation_id)
    );
  `);

  await db.none(`
    ALTER TABLE witness_prompt_deliveries
    DROP CONSTRAINT IF EXISTS witness_prompt_deliveries_unique,
    DROP CONSTRAINT IF EXISTS witness_prompt_deliveries_status_check,
    ADD CONSTRAINT witness_prompt_deliveries_unique
      UNIQUE (user_id, constellation_id),
    ADD CONSTRAINT witness_prompt_deliveries_status_check
      CHECK (status IN ('pending', 'sent', 'suppressed', 'failed'));
  `);

  await db.none(`
    ALTER TABLE constellation_cluster_links
    DROP CONSTRAINT IF EXISTS constellation_cluster_links_unique,
    DROP CONSTRAINT IF EXISTS constellation_cluster_links_order_check,
    ADD CONSTRAINT constellation_cluster_links_unique UNIQUE (constellation_id, linked_constellation_id),
    ADD CONSTRAINT constellation_cluster_links_order_check CHECK (constellation_id < linked_constellation_id);
  `);

  await db.none(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_constellations_active_incident
      ON incident_constellations (incident_id)
      WHERE status = 'active';

    CREATE INDEX IF NOT EXISTS idx_incident_constellations_location_geo
      ON incident_constellations
      USING GIST ((ST_SetSRID(ST_MakePoint(center_longitude::float, center_latitude::float), 4326)::geography));

    CREATE INDEX IF NOT EXISTS idx_incident_constellations_expires_at
      ON incident_constellations (expires_at);

    CREATE INDEX IF NOT EXISTS idx_incident_corroborations_constellation
      ON incident_corroborations (constellation_id);

    CREATE INDEX IF NOT EXISTS idx_constellation_cluster_links_constellation
      ON constellation_cluster_links (constellation_id);

    CREATE INDEX IF NOT EXISTS idx_constellation_cluster_links_linked_constellation
      ON constellation_cluster_links (linked_constellation_id);

    CREATE INDEX IF NOT EXISTS idx_witness_prompt_deliveries_user_sent
      ON witness_prompt_deliveries (user_id, sent_at)
      WHERE status = 'sent';

    CREATE INDEX IF NOT EXISTS idx_witness_prompt_deliveries_constellation
      ON witness_prompt_deliveries (constellation_id);
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_witness_constellation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration add_witness_constellation failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;
