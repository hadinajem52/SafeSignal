const pgPromise = require('pg-promise');

const initOptions = {
  capSQL: true,
};

const pgp = pgPromise(initOptions);

// Database connection string
const connectionString = process.env.DATABASE_URL || 
  'postgresql://safesignal_user:safesignal_password@localhost:6432/safesignal_db';

const db = pgp({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

function formatDatabaseError(error) {
  if (error?.message) {
    return error.message;
  }

  if (Array.isArray(error?.errors) && error.errors.length > 0) {
    return error.errors
      .map((innerError) => innerError.message)
      .filter(Boolean)
      .join('; ');
  }

  return String(error);
}

function isConnectionError(error) {
  if (!error) {
    return false;
  }

  if (CONNECTION_ERROR_CODES.has(error.code)) {
    return true;
  }

  if (Array.isArray(error.errors)) {
    return error.errors.some(isConnectionError);
  }

  return false;
}

async function verifyDatabaseConnection() {
  const connection = await db.connect();
  connection.done();
}

db.formatDatabaseError = formatDatabaseError;
db.isConnectionError = isConnectionError;
db.verifyDatabaseConnection = verifyDatabaseConnection;

module.exports = db;
