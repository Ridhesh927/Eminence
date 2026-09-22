const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const protect = require('../middleware/authMiddleware');
const { bookingsLimiter, aiBookingLimiter } = require('../middleware/rateLimiter');

router.post('/', bookingsLimiter, protect, bookingController.createBooking);
router.get('/', bookingsLimiter, protect, bookingController.getAllBookings);
router.put('/:id/status', bookingsLimiter, protect, bookingController.updateBookingStatus);
router.post('/:id/complete', bookingsLimiter, protect, bookingController.completeBooking);
router.post('/ai-booking', aiBookingLimiter, protect, bookingController.aiVoiceBooking);

module.exports = router;
