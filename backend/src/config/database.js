const pgPromise = require('pg-promise');

const initOptions = {
  capSQL: true,
};

const pgp = pgPromise(initOptions);

// Database connection string
const connectionString = process.env.DATABASE_URL || 
  'postgresql://safesignal_user:safesignal_password@localhost:5432/safesignal_db';

const db = pgp(connectionString);

// Test the connection
db.connect()
  .then((obj) => {
    console.log('✓ Database connection successful');
    obj.done();
  })
  .catch((error) => {
    console.log('✗ Database connection failed:', error.message);
  });

module.exports = db;
