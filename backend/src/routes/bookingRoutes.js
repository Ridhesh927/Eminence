const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const protect = require('../middleware/authMiddleware');

router.post('/', bookingController.createBooking);
router.get('/', protect, bookingController.getAllBookings);
router.post('/:id/complete', protect, bookingController.completeBooking);
router.post('/ai-booking', protect, bookingController.aiVoiceBooking);

module.exports = router;
