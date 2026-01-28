const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.mysqlHost,
  user: config.mysqlUser,
  password: config.mysqlPassword,
  database: config.mysqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Allow executing multiple statements in a single query (used by migrations)
  multipleStatements: true,
});

const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');

    // NOTE: Tables are created by migrations, not here
    // Run 'npm run migrate' to create tables

    connection.release();
    console.log('Database connection initialized successfully');
  } catch (error) {
    console.error('MySQL connection error:', error);
    process.exit(1);
  }
};

module.exports = {
  pool,
  initDatabase,
};
