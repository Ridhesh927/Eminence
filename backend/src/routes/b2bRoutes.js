const express = require('express');
const router = express.Router();
const b2bController = require('../controllers/b2bController');
const protect = require('../middleware/authMiddleware');

router.post('/register', protect, b2bController.registerBusiness);
router.post('/contracts', protect, b2bController.requestContract);
router.get('/contracts', protect, b2bController.getContracts);
router.get('/invoices', protect, b2bController.getInvoices);
router.post('/batch-bookings', protect, b2bController.batchBookings);

module.exports = router;
