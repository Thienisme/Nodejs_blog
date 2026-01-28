/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { pool } = require('../services/mysql');

const command = process.argv[2];

const runMigrations = async () => {
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Ensure migrations table exists
    await pool.execute(`CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const [executed] = await pool.execute(
      'SELECT filename FROM migrations'
    );
    const executedFiles = executed.map(row => row.filename);

    for (const file of files) {
      if (!executedFiles.includes(file)) {
        console.log(`Running migration: ${file}`);
        
        const sql = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );
        
// Execute full SQL file in one call (multipleStatements enabled on pool)
    await pool.query(sql);
        
        await pool.execute(
          'INSERT INTO migrations (filename) VALUES (?)',
          [file]
        );
        
        console.log(`Migration ${file} completed`);
      }
    }

    console.log('All migrations completed!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

const showStatus = async () => {
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Ensure migrations table exists
    await pool.execute(`CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const [executed] = await pool.execute(
      'SELECT filename, executed_at FROM migrations ORDER BY filename'
    );
    const executedFiles = executed.map(row => row.filename);

    console.log('\n📋 Migration Status Report');
    console.log('==========================\n');

    files.forEach((file) => {
      const executedRecord = executed.find(row => row.filename === file);
      if (executedRecord) {
        console.log(`✅ ${file} - Ran at ${executedRecord.executed_at}`);
      } else {
        console.log(`❌ ${file} - Pending`);
      }
    });

    console.log('\n📊 Summary:');
    console.log(`Total migrations: ${files.length}`);
    console.log(`Ran: ${executedFiles.length}`);
    console.log(`Pending: ${files.length - executedFiles.length}`);
  } catch (error) {
    console.error('Status error:', error);
    process.exit(1);
  }
};

const rollback = async () => {
  try {
    // Ensure migrations table exists
    await pool.execute(`CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const [executed] = await pool.execute(
      'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (executed.length === 0) {
      console.log('❌ No migrations to rollback');
      return;
    }

    const lastMigration = executed[0].filename;
    const tableName = lastMigration.includes('users') ? 'users' : 'products';
    
    await pool.execute(`DROP TABLE IF EXISTS ${tableName}`);
    await pool.execute('DELETE FROM migrations WHERE filename = ?', [lastMigration]);
    
    console.log(`✅ Rolled back: ${lastMigration}`);
  } catch (error) {
    console.error('Rollback error:', error);
    process.exit(1);
  }
};

const main = async () => {
  switch (command) {
    case 'migrate':
      await runMigrations();
      break;
    case 'status':
      await showStatus();
      break;
    case 'rollback':
      await rollback();
      break;
    default:
      console.log('Usage: node migrate-cli.js [migrate|status|rollback]');
      process.exit(1);
  }
};

main();
