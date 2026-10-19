const express = require('express');
const router = express.Router();
const { 
  getWallet, 
  applyReferralCode, 
  createWalletOrder, 
  verifyWalletFunds 
} = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');
const { apiLimiter, authLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting before auth middleware
router.use(apiLimiter);
router.use(authMiddleware);

router.get('/', getWallet);
router.post('/referral', authLimiter, applyReferralCode);
router.post('/create-order', authLimiter, createWalletOrder);
router.post('/verify-funds', authLimiter, verifyWalletFunds);

module.exports = router;
