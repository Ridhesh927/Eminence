const express = require('express');
const router = express.Router();
const multer = require('multer');
const b2bController = require('../controllers/b2bController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter, batchBookingLimiter } = require('../middleware/rateLimiter');

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  storage: multer.memoryStorage()
});

router.post('/register', apiLimiter, protect, b2bController.registerBusiness);
router.post('/contracts', apiLimiter, protect, b2bController.requestContract);
router.get('/contracts', apiLimiter, protect, b2bController.getContracts);
router.get('/invoices', apiLimiter, protect, b2bController.getInvoices);
router.post('/batch-bookings', batchBookingLimiter, protect, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload error' });
    }
    next();
  });
}, b2bController.batchBookings);

module.exports = router;
