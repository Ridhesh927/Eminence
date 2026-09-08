const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const protect = require('../middleware/authMiddleware');

const aiBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', bookingController.createBooking);
router.get('/', protect, bookingController.getAllBookings);
router.post('/:id/complete', protect, bookingController.completeBooking);
router.post('/ai-booking', aiBookingLimiter, protect, bookingController.aiVoiceBooking);

module.exports = router;
