const express = require('express');
const router = express.Router();
const { getWallet, applyReferralCode } = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getWallet);
router.post('/referral', authMiddleware, applyReferralCode);

module.exports = router;
