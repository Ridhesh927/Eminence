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
    type: DataTypes.JSON,
    allowNull: true,
  },
  totalDistance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: { args: [0.1], msg: 'Distance must be at least 0.1 km' }
    }
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
    validate: {
      min: { args: [1], msg: 'Weight must be at least 1 kg' },
      max: { args: [25000], msg: 'Weight cannot exceed 25,000 kg' }
    }
  },
  tempoType: {
    type: DataTypes.ENUM('small', 'medium', 'large'),
    allowNull: false,
  },
  estimatedFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0.01], msg: 'Estimated fare must be greater than zero' }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'driver_assigned', 'arrived', 'in_transit', 'completed', 'cancelled', 'expired'),
    defaultValue: 'pending',
  },
  paymentMethod: {
    type: DataTypes.ENUM('online', 'cash', 'postpaid', 'wallet'),
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
  queuePosition: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  vehicleId: {
    type: DataTypes.UUID,
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
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancellationReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cancelledBy: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = Booking;
