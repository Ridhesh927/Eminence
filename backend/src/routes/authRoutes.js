const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public Route
router.post('/google-login', authController.googleLogin);
router.post('/phone-login', authController.phoneLogin);
router.post('/phone-verify', authController.phoneVerify);

// Protected Routes
router.post('/complete-profile', authMiddleware, authController.updateProfile);
router.post('/send-otp', authMiddleware, authController.sendOtp);
router.post('/verify-otp', authMiddleware, authController.verifyOtp);

module.exports = router;
