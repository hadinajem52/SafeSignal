const db = require('../src/config/database');

module.exports = async () => {
  await db.$pool.end();
};
