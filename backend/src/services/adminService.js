/**
 * Admin Service
 * Handles admin-only business logic for staff onboarding and database management.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

const STAFF_APPLICATION_ROLES = ['moderator', 'law_enforcement'];
const MANAGED_TABLES = [
  'users',
  'incidents',
  'reports',
  'moderation_queue',
  'report_actions',
  'report_links',
  'report_ml',
  'incident_comments',
  'moderator_settings',
];

function normalizeTableName(tableName) {
  return String(tableName || '').trim().toLowerCase();
}

function assertManagedTable(tableName) {
  const normalizedTable = normalizeTableName(tableName);
  if (!MANAGED_TABLES.includes(normalizedTable)) {
    throw ServiceError.badRequest('Table is not managed by admin tools');
  }
  return normalizedTable;
}

async function getPrimaryKeyColumn(tableName) {
  const result = await db.oneOrNone(
    `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
      LIMIT 1
    `,
    [tableName]
  );

  if (!result?.column_name) {
    throw ServiceError.badRequest(`Primary key not found for table ${tableName}`);
  }

  return result.column_name;
}

async function getPendingApplications() {
  const rows = await db.manyOrNone(
    `
      SELECT user_id, username, email, role, created_at
      FROM users
      WHERE role = ANY($1::text[])
        AND is_verified = FALSE
      ORDER BY created_at ASC
    `,
    [STAFF_APPLICATION_ROLES]
  );

  return rows.map((row) => ({
    id: row.user_id,
    username: row.username,
    email: row.email,
    role: row.role,
    appliedAt: row.created_at,
  }));
}

async function approveApplication(userId) {
  const targetUser = await db.oneOrNone(
    `
      SELECT user_id, username, email, role, is_verified
      FROM users
      WHERE user_id = $1
        AND role = ANY($2::text[])
    `,
    [userId, STAFF_APPLICATION_ROLES]
  );

  if (!targetUser) {
    throw ServiceError.notFound('Application');
  }

  if (targetUser.is_verified) {
    return {
      id: targetUser.user_id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
      status: 'already_approved',
    };
  }

  const updatedUser = await db.one(
    `
      UPDATE users
      SET is_verified = TRUE, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, username, email, role
    `,
    [userId]
  );

  return {
    id: updatedUser.user_id,
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role,
    status: 'approved',
  };
}

async function rejectApplication(userId) {
  const deletedUser = await db.oneOrNone(
    `
      DELETE FROM users
      WHERE user_id = $1
        AND role = ANY($2::text[])
        AND is_verified = FALSE
      RETURNING user_id, username, email, role
    `,
    [userId, STAFF_APPLICATION_ROLES]
  );

  if (!deletedUser) {
    throw ServiceError.notFound('Pending application');
  }

  return {
    id: deletedUser.user_id,
    username: deletedUser.username,
    email: deletedUser.email,
    role: deletedUser.role,
    status: 'rejected',
  };
}

async function getDatabaseTables() {
  const tableStats = [];

  for (const tableName of MANAGED_TABLES) {
    const primaryKey = await getPrimaryKeyColumn(tableName);
    const countResult = await db.one('SELECT COUNT(*)::int AS count FROM $1~', [tableName]);

    tableStats.push({
      tableName,
      primaryKey,
      rowCount: parseInt(countResult.count, 10) || 0,
    });
  }

  return tableStats;
}

async function getTableRows(tableName, limit = 50) {
  const normalizedTable = assertManagedTable(tableName);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const primaryKey = await getPrimaryKeyColumn(normalizedTable);

  const rows = await db.manyOrNone(
    'SELECT * FROM $1~ ORDER BY $2~ DESC LIMIT $3',
    [normalizedTable, primaryKey, safeLimit]
  );

  return {
    tableName: normalizedTable,
    primaryKey,
    rows,
  };
}

async function deleteRow(tableName, rowId) {
  const normalizedTable = assertManagedTable(tableName);
  const parsedId = parseInt(rowId, 10);

  if (!Number.isInteger(parsedId)) {
    throw ServiceError.badRequest('Row ID must be an integer');
  }

  const primaryKey = await getPrimaryKeyColumn(normalizedTable);
  const deletedRow = await db.oneOrNone(
    'DELETE FROM $1~ WHERE $2~ = $3 RETURNING *',
    [normalizedTable, primaryKey, parsedId]
  );

  if (!deletedRow) {
    throw ServiceError.notFound('Row');
  }

  return {
    tableName: normalizedTable,
    primaryKey,
    deletedId: deletedRow[primaryKey],
  };
}

async function clearTable(tableName) {
  const normalizedTable = assertManagedTable(tableName);
  await db.none('TRUNCATE TABLE $1~ RESTART IDENTITY CASCADE', [normalizedTable]);

  return {
    tableName: normalizedTable,
    status: 'cleared',
  };
}

async function clearAllManagedTables() {
  await db.tx(async (transaction) => {
    for (const tableName of MANAGED_TABLES) {
      await transaction.none('TRUNCATE TABLE $1~ RESTART IDENTITY CASCADE', [tableName]);
    }
  });

  return {
    tables: MANAGED_TABLES,
    status: 'cleared',
  };
}

async function resetAllReports() {
  const countsBeforeReset = await db.one(`
    SELECT
      COUNT(*)::int AS incidents,
      COUNT(*) FILTER (WHERE is_draft = FALSE)::int AS submitted_incidents
    FROM incidents
  `);

  await db.none('TRUNCATE TABLE incidents RESTART IDENTITY CASCADE');

  return {
    incidentsBeforeReset: parseInt(countsBeforeReset.incidents, 10) || 0,
    submittedIncidentsBeforeReset: parseInt(countsBeforeReset.submitted_incidents, 10) || 0,
    incidentsAfterReset: 0,
    submittedIncidentsAfterReset: 0,
    status: 'cleared',
  };
}

module.exports = {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getDatabaseTables,
  getTableRows,
  deleteRow,
  clearTable,
  clearAllManagedTables,
  resetAllReports,
  MANAGED_TABLES,
};
