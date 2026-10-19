const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const protect = require('../middleware/authMiddleware');
const { bookingsLimiter, bookingCreateLimiter, aiBookingLimiter } = require('../middleware/rateLimiter');

const { generateInvoice } = require('../controllers/invoiceController');

router.post('/', bookingCreateLimiter, protect, bookingController.createBooking);
router.get('/', bookingsLimiter, protect, bookingController.getAllBookings);
router.get('/:id', bookingsLimiter, protect, bookingController.getBookingById);
router.get('/:id/receipt', bookingsLimiter, protect, generateInvoice);
router.get('/:id/invoice', bookingsLimiter, protect, generateInvoice);
router.put('/:id/status', bookingsLimiter, protect, bookingController.updateBookingStatus);
router.post('/:id/cancel', bookingsLimiter, protect, bookingController.cancelBooking);
router.post('/:id/complete', bookingsLimiter, protect, bookingController.completeBooking);
router.post('/ai-booking', aiBookingLimiter, protect, bookingController.aiVoiceBooking);

module.exports = router;
