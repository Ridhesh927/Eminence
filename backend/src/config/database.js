const process = require('node:process');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (.env.local first, overriding any parent process variables)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const dbUrl = process.env.DATABASE_URL;
const useSqlite = process.env.USE_SQLITE === 'true' || process.env.DB_DIALECT === 'sqlite' || !dbUrl || dbUrl.startsWith('sqlite:');
let sequelize;

if (!useSqlite && dbUrl) {
  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const sequelizeOptions = {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
  };

  // Enable SSL for remote databases (like NeonDB)
  if (!isLocalhost) {
    sequelizeOptions.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  }

  sequelize = new Sequelize(dbUrl, sequelizeOptions);
} else if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  // Local development fallback to SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../eminence.sqlite'),
    logging: false,
  });
} else {
  console.error('\n================================================================');
  console.error('ERROR: DATABASE_URL is not defined in environment variables.');
  console.error('Please configure your database connection inside backend/.env');
  console.error('================================================================\n');
  throw new Error('DATABASE_URL environment variable is required in production');
}

module.exports = sequelize;
