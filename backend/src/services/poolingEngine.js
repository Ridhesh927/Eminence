/**
 * poolingEngine.js
 * 
 * Simulates a Dynamic Load Pooling (Less Than Truckload - LTL) Engine.
 * Matches a new LTL booking with an existing active truck that has similar
 * routes and remaining capacity.
 */

const { Booking } = require('../models');

/**
 * Attempts to pool a new booking into an existing shared vehicle.
 * @param {Object} newBookingData The incoming LTL booking payload
 * @returns {String|null} existingBookingId if pooled, null if new truck needed
 */
const findPoolMatch = async (newBookingData) => {
  try {
    // In a real system, we would query the database for active 'shared' bookings
    // where status is 'pending' or 'driver_assigned', check the route geometry,
    // and verify the total volume/weight constraint.

    // Here we simulate the pooling check
    const activePools = await Booking.findAll({
      where: {
        bookingMode: 'shared',
        status: 'pending' // or driver_assigned
      },
      limit: 10
    });

    for (let pool of activePools) {
      // Simulate checking if the new pickup/dropoff is along the pool's route
      // and if (pool.currentWeight + newBooking.weight <= MAX_CAPACITY)
      
      // Simple mock logic: if the date matches and it's a shared booking, we pool it!
      if (pool.date === newBookingData.date) {
        return pool.id;
      }
    }

    return null; // No match found, dispatch a new truck
  } catch (error) {
    console.error("Error in pooling engine:", error);
    return null;
  }
};

module.exports = {
  findPoolMatch
};
