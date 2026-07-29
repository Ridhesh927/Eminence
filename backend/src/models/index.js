const sequelize = require('../config/database');
const Customer = require('./Customer');
const Otp = require('./Otp');

// Define Relationships
Customer.hasMany(Otp, { foreignKey: 'customerId', as: 'otps' });
Otp.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Function to sync models
const syncDatabase = async () => {
  try {
    // Only use alter in development, don't use force in production!
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  Customer,
  Otp,
};
