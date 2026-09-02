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
  return;
};


// Function to sync models
const syncDatabase = async () => {
  try {
    await bootstrapDatabase();
    // Only use alter in development, don't use force in production!
    await sequelize.sync();
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

      // Seed Driver
      const driverCount = await Driver.count();
      let seededDriver;
      if (driverCount === 0) {
        seededDriver = await Driver.create({
          name: 'Ramesh Kumar',
          phone: '9876543210',
          licenseNumber: 'MH12AB1234',
          status: 'active',
          rating: 4.8
        });
        console.log('Seeded default driver');
      } else {
        seededDriver = await Driver.findOne();
      }

      // Seed Vehicle
      const vehicleCount = await Vehicle.count();
      let seededVehicle;
      if (vehicleCount === 0) {
        seededVehicle = await Vehicle.create({
          registrationNumber: 'MH-12-PQ-1234',
          type: 'small',
          capacityWeight: 500,
          status: 'available'
        });
        console.log('Seeded default vehicle');
      } else {
        seededVehicle = await Vehicle.findOne();
      }

      // Seed Bookings
      const bookingCount = await Booking.count();
      if (bookingCount === 0 && user && seededDriver && seededVehicle) {
        await Booking.create({
          customerId: user.id,
          driverId: seededDriver.id,
          vehicleId: seededVehicle.id,
          pickupAddress: 'Swargate, Pune',
          dropAddress: 'Hinjewadi Phase 1, Pune',
          date: '2026-08-31',
          time: '10:00:00',
          goodsType: 'Boxes of books',
          weight: 150,
          tempoType: 'small',
          estimatedFare: 350.00,
          status: 'driver_assigned',
          paymentMethod: 'online',
          paymentStatus: 'pending'
        });
        
        await Booking.create({
          customerId: user.id,
          driverId: seededDriver.id,
          vehicleId: seededVehicle.id,
          pickupAddress: 'Pune Station',
          dropAddress: 'Kothrud, Pune',
          date: '2026-08-30',
          time: '14:30:00',
          goodsType: 'Furniture',
          weight: 400,
          tempoType: 'medium',
          estimatedFare: 550.00,
          status: 'completed',
          paymentMethod: 'cash',
          paymentStatus: 'completed'
        });
        console.log('Seeded default bookings for demo user');
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
