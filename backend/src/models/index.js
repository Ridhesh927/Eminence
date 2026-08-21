const sequelize = require('../config/database');
const process = require('node:process');
const Customer = require('./Customer');
const Otp = require('./Otp');
const Driver = require('./Driver');
const Vehicle = require('./Vehicle');
const Booking = require('./Booking');

// Define Relationships
Customer.hasMany(Otp, { foreignKey: 'customerId', as: 'otps' });
Otp.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Driver.hasMany(Booking, { foreignKey: 'driverId', as: 'bookings' });
Booking.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Vehicle.hasMany(Booking, { foreignKey: 'vehicleId', as: 'bookings' });
Booking.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

const { Client } = require('pg');

const bootstrapDatabase = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'))) {
    return;
  }
  
  try {
    const matches = dbUrl.match(/postgresql?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!matches) return;
    
    const [_, user, password, host, port, dbName] = matches;
    
    const client = new Client({
      user,
      password,
      host,
      port: parseInt(port),
      database: 'postgres'
    });
    
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
    if (res.rowCount === 0) {
      console.log(`Database ${dbName} does not exist. Creating it...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully.`);
    }
    await client.end();
  } catch (err) {
    console.warn('Database bootstrap warning (make sure credentials are correct):', err.message);
  }
};

// Function to sync models
const syncDatabase = async () => {
  try {
    await bootstrapDatabase();
    // Only use alter in development, don't use force in production!
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synced successfully');

    // Seed default/demo user on startup
    const seedPhone = process.env.SEED_PHONE || '1234567890';
    const seedName = process.env.SEED_NAME || 'Demo User';

    if (seedPhone) {
      const [user, created] = await Customer.findOrCreate({
        where: { phone: seedPhone },
        defaults: {
          name: seedName,
          isPhoneVerified: true,
          isProfileComplete: true
        }
      });
      if (created) {
        console.log(`Seeded default user: ${seedName} (${seedPhone})`);
      }
    }
  } catch (error) {
    console.error('Error syncing database:', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  Customer,
  Otp,
  Driver,
  Vehicle,
  Booking
};
