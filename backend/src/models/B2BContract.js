const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const B2BContract = sequelize.define('B2BContract', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  vehicleType: {
    type: DataTypes.ENUM('small', 'medium', 'large'),
    allowNull: false,
  },
  vehicleCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  dailyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  volumeCommitment: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Minimum rides or volume committed per month'
  },
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'expired', 'cancelled', 'rejected'),
    defaultValue: 'pending',
  }
}, {
  timestamps: true,
});

module.exports = B2BContract;
