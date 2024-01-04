const pgp = require('pg-promise')();

// Create a new instance with promise mode enabled
const db = pgp({
  connectionString: process.env.DATABASE_URL,
  ssl:{rejectUnauthorized: false}
}, { promiseLib: Promise });

async function dbQuery(queryString, args = []) {
  try {
    return await db.any(queryString, args);
  } catch (error) {
    console.error('ERROR:', error);
    throw new Error('Database query failed');
  }
}

module.exports = { dbQuery };