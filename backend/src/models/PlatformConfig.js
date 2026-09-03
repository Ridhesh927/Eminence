const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlatformConfig = sequelize.define('PlatformConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  brandName: {
    type: DataTypes.STRING,
    defaultValue: 'Eminence Logistics',
  },
  primaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#b87333', // Copper
  },
  secondaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#4a5c3f', // Moss green
  },
  accentColor: {
    type: DataTypes.STRING,
    defaultValue: '#c8a96e', // Gold
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tagline: {
    type: DataTypes.STRING,
    defaultValue: 'Move More. Spend Less.',
  },
  supportEmail: {
    type: DataTypes.STRING,
    defaultValue: 'support@eminence.com',
  }
}, {
  timestamps: true,
});

module.exports = PlatformConfig;
