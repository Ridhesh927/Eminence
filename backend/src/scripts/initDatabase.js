/**
 * Eminence Production / Staging Database Initializer
 *
 * Safely provisions database tables, views, and initial fleet/admin records.
 * Non-destructive: Uses CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 * Never drops tables or truncates production data.
 *
 * Usage:
 *   node src/scripts/initDatabase.js
 *   npm run db:init
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.DB_SYNC = 'true';

const { sequelize, syncDatabase } = require('../models');

async function main() {
  console.log('\n========================================================================');
  console.log('           EMINENCE CONTROLLED DATABASE INITIALIZATION                   ');
  console.log('========================================================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Dialect:     ${sequelize.getDialect()}`);

  try {
    await sequelize.authenticate();
    console.log('[1/2] Database connection authenticated successfully.');

    await syncDatabase();
    console.log('[2/2] Schema synchronized and verified without destructive drops.');

    console.log('\n========================================================================');
    console.log('Database initialization completed successfully. Ready for deployment!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\nDatabase initialization failed:', err.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {}
  }
}

main();
