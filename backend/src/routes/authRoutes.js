const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Public Route (with rate limiting)
router.get('/terms', authController.getTerms);
router.post('/google-login', authLimiter, authController.googleLogin);
router.post('/phone-login', authLimiter, authController.phoneLogin);
router.post('/phone-verify', authLimiter, authController.phoneVerify);
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Protected Routes
router.post('/accept-terms', authLimiter, authMiddleware, authController.acceptTerms);
router.post('/complete-profile', authLimiter, authMiddleware, authController.updateProfile);
router.post('/send-otp', otpLimiter, authMiddleware, authController.sendOtp);
router.post('/verify-otp', authLimiter, authMiddleware, authController.verifyOtp);

// DPDP / GDPR Compliance Routes
router.get('/export-data', authLimiter, authMiddleware, authController.exportUserData);
router.post('/delete-account', authLimiter, authMiddleware, authController.deleteUserData);

module.exports = router;
