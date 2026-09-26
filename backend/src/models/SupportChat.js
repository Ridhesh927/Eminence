const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupportChat = sequelize.define('SupportChat', {
  customerId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  messages: {
    type: DataTypes.JSONB,
    defaultValue: [],
  }
}, {
  timestamps: true,
});

module.exports = SupportChat;
