const cron = require('node-cron');
const { Op } = require('sequelize');
const { Booking } = require('./models');

// Run every minute
const scheduleDriverAllocation = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Target time is exactly 30 minutes from now (checking between 30 and 31 minutes ahead)
      const targetTimeStart = new Date(now.getTime() + 30 * 60000);
      const targetTimeEnd = new Date(now.getTime() + 31 * 60000);

      const upcomingBookings = await Booking.findAll({
        where: {
          status: 'pending',
          scheduledAt: {
            [Op.between]: [targetTimeStart, targetTimeEnd]
          }
        }
      });

      if (upcomingBookings.length > 0) {
        console.log(`[CRON] Found ${upcomingBookings.length} scheduled bookings needing driver allocation in 30 mins.`);
        
        for (const booking of upcomingBookings) {
          // Simulate driver allocation
          // In a real app, this would use geospatial querying to find nearest active drivers
          booking.status = 'driver_assigned';
          // booking.driverId = someDriverId;
          await booking.save();
          console.log(`[CRON] Allocated driver for booking ID: ${booking.id}`);
        }
      }
    } catch (error) {
      console.error('[CRON] Error during driver allocation schedule:', error);
    }
  });
};

const initCronJobs = () => {
  console.log('Initializing background cron jobs...');
  scheduleDriverAllocation();
};

module.exports = {
  initCronJobs
};
