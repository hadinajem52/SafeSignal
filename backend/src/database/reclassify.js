/**
 * One-time script: retroactively ML-classify incidents stuck at category='other'
 * because the ML pipeline failed before the schema/code fixes.
 * 
 * Usage: node src/database/reclassify.js
 * Safe to run multiple times (skips incidents that are already non-'other').
 */

const db = require('../config/database');
const mlClient = require('../utils/mlClient');
const { VALID_CATEGORIES } = require('../../../constants/incident');

const mapRiskToSeverity = (riskScore) => {
  if (riskScore >= 0.60) return 'critical';
  if (riskScore >= 0.40) return 'high';
  if (riskScore >= 0.25) return 'medium';
  return 'low';
};

async function reclassify() {
  const rows = await db.manyOrNone(
    `SELECT i.incident_id, i.title, i.description, i.category, i.severity
     FROM incidents i
     WHERE i.category = 'other'
       AND i.is_draft = FALSE
     ORDER BY i.incident_id`
  );

  console.log(`Found ${rows.length} incidents with category='other'`);

  let updated = 0;
  for (const row of rows) {
    const text = `${row.title} ${row.description}`;

    try {
      const ml = await mlClient.analyzeIncident({
        text,
        category: row.category,
        severity: row.severity,
        duplicateCount: 0,
      });

      if (!ml || !ml.classification) {
        console.log(`  #${row.incident_id} — ML service returned no classification, skipping`);
        continue;
      }

      const cat = ml.classification.predictedCategory;
      const conf = ml.classification.confidence;
      const risk = ml.risk ? ml.risk.riskScore : null;
      const sev = risk !== null ? mapRiskToSeverity(risk) : row.severity;
      const shouldUpdate = cat && cat !== 'other' && VALID_CATEGORIES.includes(cat);

      const label = `#${row.incident_id} "${row.title.substring(0, 40)}"`;
      console.log(
        `  ${label} → ${cat} (${conf.toFixed(2)}), risk=${(risk || 0).toFixed(2)}, sev=${sev}${shouldUpdate ? ' ✓ UPDATING' : ' — skip (still other)'}`
      );

      if (shouldUpdate) {
        await db.none(
          `UPDATE incidents
           SET category = $1, severity = $2, updated_at = CURRENT_TIMESTAMP
           WHERE incident_id = $3`,
          [cat, sev, row.incident_id]
        );
        updated++;
      }
    } catch (err) {
      console.error(`  #${row.incident_id} — error: ${err.message}`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${rows.length} incidents.`);
  process.exit(0);
}

reclassify().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
