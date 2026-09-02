const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (.env.local first, overriding any parent process variables)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

// Always use SQLite for local development to avoid postgres auth/credential issues
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, '../../eminence.sqlite'),
  logging: false,
});

module.exports = sequelize;
