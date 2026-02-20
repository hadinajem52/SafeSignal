/**
 * Migration: add incident embeddings + moderator dedup verdict columns
 *
 * 1. incidents.text_embedding FLOAT4[]
 *    Stores the Gemini embedding of each incident's text at creation time.
 *    Allows future submissions to compute cosine similarity in-process instead
 *    of re-embedding candidates on every new-incident ML call.
 *
 * 2. report_ml.dedup_verdict / dedup_verdict_by / dedup_verdict_at
 *    Records the human ground-truth label for each ML duplicate prediction.
 *    'confirmed_duplicate' → moderator merged the incident.
 *    'not_duplicate'       → moderator dismissed the duplicate flag.
 *    Used for offline threshold calibration and accuracy measurement.
 */

const db = require('../../config/database');

async function migrate() {
  try {
    console.log('Migrating: adding text_embedding to incidents…');
    await db.none(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS text_embedding FLOAT4[];
    `);

    // Partial index: only rows that actually have an embedding.
    // Keeps the index tiny and the planner happy.
    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_incidents_has_embedding
      ON incidents (incident_id)
      WHERE text_embedding IS NOT NULL;
    `);
    console.log('✓ incidents.text_embedding added');

    console.log('Migrating: adding moderator dedup verdict columns to report_ml…');
    await db.none(`
      ALTER TABLE report_ml
      ADD COLUMN IF NOT EXISTS dedup_verdict VARCHAR(30)
        CHECK (dedup_verdict IS NULL OR dedup_verdict IN ('confirmed_duplicate', 'not_duplicate'));
    `);
    await db.none(`
      ALTER TABLE report_ml
      ADD COLUMN IF NOT EXISTS dedup_verdict_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
    `);
    await db.none(`
      ALTER TABLE report_ml
      ADD COLUMN IF NOT EXISTS dedup_verdict_at TIMESTAMP;
    `);
    await db.none(`
      CREATE INDEX IF NOT EXISTS idx_report_ml_dedup_verdict
      ON report_ml (dedup_verdict)
      WHERE dedup_verdict IS NOT NULL;
    `);
    console.log('✓ report_ml dedup verdict columns added');

    console.log('✓ Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate();
