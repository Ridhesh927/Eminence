const { Booking, Wallet, Transaction } = require('../models');
const { Op } = require('sequelize');
const { createAndEmitNotification } = require('./notificationService');

/**
 * Checks and expires untouched bookings that have passed their validity deadline (expiresAt or 24h default)
 * without any assigned driver.
 * Automatically refunds any paid fare to the customer's wallet and emits socket update events.
 * 
 * @returns {Promise<number>} Number of expired bookings processed
 */
const expireUntouchedBookings = async () => {
  try {
    const now = new Date();
    // Untouched bookings expire if:
    // 1. `expiresAt` is set and now >= expiresAt
    // 2. OR `expiresAt` is null and booking was created > 24 hours ago
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expiredBookings = await Booking.findAll({
      where: {
        status: 'pending',
        driverId: null,
        [Op.or]: [
          { expiresAt: { [Op.ne]: null, [Op.lte]: now } },
          { expiresAt: null, createdAt: { [Op.lte]: twentyFourHoursAgo } }
        ]
      }
    });

    if (!expiredBookings || expiredBookings.length === 0) {
      return 0;
    }

    console.log(`[EXPIRY] Processing ${expiredBookings.length} untouched bookings past validity window.`);

    for (const booking of expiredBookings) {
      booking.status = 'expired';
      booking.cancellationReason = 'Expired: Untouched without driver assignment past validity deadline';
      booking.cancelledBy = 'system';

      // Auto-refund to customer's wallet if booking was paid
      if (booking.paymentStatus === 'completed' || booking.paymentMethod === 'wallet') {
        const fare = parseFloat(booking.estimatedFare) || 0;
        if (fare > 0 && booking.customerId) {
          try {
            let wallet = await Wallet.findOne({ where: { customerId: booking.customerId } });
            if (!wallet) {
              wallet = await Wallet.create({ customerId: booking.customerId, balance: 0.00 });
            }
            wallet.balance = parseFloat((parseFloat(wallet.balance) + fare).toFixed(2));
            await wallet.save();

            await Transaction.create({
              walletId: wallet.id,
              amount: fare,
              type: 'CREDIT',
              description: `Auto-Refund for Expired Tempo Booking #${booking.id.slice(0, 8)}`,
              referenceId: booking.id
            }).catch(err => console.warn('[EXPIRY] Wallet refund log note:', err.message));
          } catch (refundErr) {
            console.error('[EXPIRY] Failed to process auto-refund:', refundErr);
          }
        }
      }

      await booking.save();
      console.log(`[EXPIRY] Expired untouched booking ${booking.id} and refunded any paid fare.`);

      // Broadcast status change via Socket.io
      try {
        const { getIo } = require('../socket');
        const io = getIo();
        if (io) {
          io.to(`trip_${booking.id}`).emit('booking_status_updated', {
            bookingId: booking.id,
            status: 'expired',
            cancellationReason: booking.cancellationReason,
            cancelledBy: 'system',
            booking
          });
          io.to(`trip_${booking.id}`).emit('trip:status', {
            bookingId: booking.id,
            status: 'expired'
          });
        }
      } catch (sockErr) {
        // Socket broadcast error ignored
      }

      if (booking.customerId) {
        createAndEmitNotification({
          userId: booking.customerId,
          recipientRole: 'customer',
          title: 'Booking Expired',
          message: `Booking #${booking.id.slice(0, 8)} expired as no driver accepted within the window. Advance funds refunded.`,
          type: 'expired',
          metadata: { bookingId: booking.id }
        }).catch(() => {});
      }

      createAndEmitNotification({
        recipientRole: 'admin',
        title: `Booking Expired #${booking.id.slice(0, 8)}`,
        message: `Booking #${booking.id.slice(0, 8)} expired without driver acceptance.`,
        type: 'expired',
        metadata: { bookingId: booking.id }
      }).catch(() => {});
    }

    return expiredBookings.length;
  } catch (error) {
    console.warn('[EXPIRY] Error during booking expiry check:', error.message);
    return 0;
  }
};

module.exports = {
  expireUntouchedBookings
};
