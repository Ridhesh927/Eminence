const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupportChat = sequelize.define('SupportChat', {
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  messages: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
}, {
  timestamps: true,
  tableName: 'SupportChats',
});

module.exports = SupportChat;
