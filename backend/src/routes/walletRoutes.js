const express = require('express');
const router = express.Router();
const { getWallet, applyReferralCode } = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting and auth middleware to wallet routes
router.use(apiLimiter);
router.use(authMiddleware);

router.get('/', getWallet);
router.post('/referral', applyReferralCode);

module.exports = router;
