const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false, // e.g. 'CREATE_DRIVER', 'DELETE_CUSTOMER'
  },
  performedBy: {
    type: DataTypes.STRING,
    allowNull: true, // Admin ID or 'SYSTEM'
  },
  performedByRole: {
    type: DataTypes.STRING,
    allowNull: true, // 'admin', 'driver', 'customer'
  },
  resourceType: {
    type: DataTypes.STRING,
    allowNull: true, // e.g. 'Driver', 'Booking'
  },
  resourceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true, // Extra context (before/after changes, etc.)
  }
}, {
  timestamps: true,
});

module.exports = AuditLog;
