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
          // TODO: Replace this stub with real geospatial nearest-driver query
          // e.g. find nearest active Driver by lat/lng, then:
          //   booking.driverId = nearestDriver.id;
          //   booking.status = 'driver_assigned';
          //   await booking.save();
          // For now, log a warning instead of setting driver_assigned without a real driverId
          console.warn(`[CRON] STUB: Booking ${booking.id} needs driver allocation — implement geospatial query`);
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
