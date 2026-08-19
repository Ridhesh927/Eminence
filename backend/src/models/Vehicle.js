const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  registrationNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('small', 'medium', 'large'),
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  capacityWeight: {
    type: DataTypes.INTEGER, // in kg
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'maintenance', 'on_trip'),
    defaultValue: 'available',
  }
}, {
  timestamps: true,
});

module.exports = Vehicle;
