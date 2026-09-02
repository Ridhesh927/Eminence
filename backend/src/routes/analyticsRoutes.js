const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Apply auth and admin middleware to all routes in this router
router.use(authMiddleware);
router.use(adminMiddleware);

// Aggregation endpoints
router.get('/overview', adminController.getOverviewStats);
router.get('/revenue', adminController.getRevenueAnalytics);
router.get('/routes', adminController.getRouteAnalytics);

module.exports = router;
