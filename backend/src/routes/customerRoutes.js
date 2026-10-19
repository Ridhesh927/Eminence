const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');
const { apiLimiter, paymentLimiter } = require('../middleware/rateLimiter');

// All customer routes are protected by rate limiting and authentication
router.use(apiLimiter);
router.use(authMiddleware);

// Eminence Pro Subscription routes
router.get('/pro/status', customerController.getProStatus);
router.post('/pro/create-order', paymentLimiter, customerController.createProOrder);
router.post('/pro/verify', paymentLimiter, customerController.verifyProSubscription);

module.exports = router;
