const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');

// Public route for admin login
router.post('/login', adminAuthController.adminLogin);

module.exports = router;
