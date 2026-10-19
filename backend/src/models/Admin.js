const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Administrator'
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Support Admin'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pushToken: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = Admin;
