const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public Route (with rate limiting)
router.post('/google-login', authLimiter, authController.googleLogin);
router.post('/phone-login', authLimiter, authController.phoneLogin);
router.post('/phone-verify', authLimiter, authController.phoneVerify);

// Protected Routes
router.post('/complete-profile', authLimiter, authMiddleware, authController.updateProfile);
router.post('/send-otp', authLimiter, authMiddleware, authController.sendOtp);
router.post('/verify-otp', authLimiter, authMiddleware, authController.verifyOtp);

module.exports = router;
