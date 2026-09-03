const express = require('express');
const router = express.Router();
const { getWallet, applyReferralCode } = require('../controllers/walletController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, getWallet);
router.post('/referral', protect, applyReferralCode);

module.exports = router;
