/**
 * Startup schema check.
 * init.js is run manually (db:init), not on boot, so a table added to the schema
 * can be silently missing until it surfaces as a runtime 500. This compares the
 * tables init.js defines against the live database and logs loudly if any are
 * missing — turning a confusing runtime error into an obvious boot-time message.
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');

// Single source of truth: the tables init.js declares.
function getSchemaTables() {
  const initSource = fs.readFileSync(path.join(__dirname, 'init.js'), 'utf8');
  const matches = initSource.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi);
  return [...matches].map((match) => match[1]);
}

async function verifySchema() {
  try {
    const tables = getSchemaTables();
    if (tables.length === 0) return;

    const missing = await db.manyOrNone(
      `SELECT t.name
       FROM unnest($1::text[]) AS t(name)
       WHERE to_regclass('public.' || t.name) IS NULL`,
      [tables]
    );

    if (missing.length > 0) {
      const names = missing.map((row) => row.name).join(', ');
      logger.error(
        `Schema out of date — missing table(s): ${names}. ` +
          'Run `npm run db:init` to create them, then restart.'
      );
    }
  } catch (error) {
    logger.warn(`Schema verification skipped: ${db.formatDatabaseError(error)}`);
  }
}

module.exports = verifySchema;
