const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'on_trip'),
    defaultValue: 'active',
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
  },
  currentLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  currentLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = Driver;
