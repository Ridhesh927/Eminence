const process = require('node:process');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

const path = require('path');

// Load environment variables (.env.local first, overriding any parent process variables)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('\n================================================================');
  console.error('ERROR: DATABASE_URL is not defined in environment variables.');
  console.error('Please configure your database connection inside backend/.env.local');
  console.error('Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/eminence_db');
  console.error('================================================================\n');
  throw new Error('DATABASE_URL environment variable is required');
}

const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const sequelizeOptions = {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
};

// Enable SSL only for remote databases (like NeonDB)
if (!isLocalhost) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

const sequelize = new Sequelize(dbUrl, sequelizeOptions);

module.exports = sequelize;

