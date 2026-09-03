const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  dimensions: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('In Warehouse', 'Loaded', 'In Transit', 'Delivered'),
    defaultValue: 'In Warehouse',
  }
}, {
  timestamps: true,
});

module.exports = Inventory;
