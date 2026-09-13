const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserConsent = sequelize.define('UserConsent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userType: {
    type: DataTypes.ENUM('customer', 'driver'),
    defaultValue: 'customer',
  },
  termsVersion: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'v1.0',
  },
  accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  acceptedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
});

module.exports = UserConsent;
