const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
    allowNull: true, // Made nullable for multi-stop
  },
  stops: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  totalDistance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  isRoundTrip: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  waitingTimeHours: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  waitingFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  insuranceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  bookingMode: {
    type: DataTypes.ENUM('dedicated', 'shared'),
    defaultValue: 'dedicated',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
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
    type: DataTypes.ENUM('online', 'cash', 'postpaid'),
    allowNull: false,
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  otp: {
    type: DataTypes.STRING(4),
    allowNull: true,
  },
  // B2B Fields
  isB2B: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  gstAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  // ESG & 3PL Fields
  esgEmissions: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  is3plOutsourced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  thirdPartyProvider: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  podHash: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = Booking;
