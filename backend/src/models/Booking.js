const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Customer = require('./Customer');
const Driver = require('./Driver');
const Vehicle = require('./Vehicle');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  pickupAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  dropAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  goodsType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tempoType: {
    type: DataTypes.ENUM('small', 'medium', 'large'),
    allowNull: false,
  },
  estimatedFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'driver_assigned', 'arrived', 'in_transit', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  paymentMethod: {
    type: DataTypes.ENUM('online', 'cash'),
    allowNull: false,
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  otp: {
    type: DataTypes.STRING(4),
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = Booking;
