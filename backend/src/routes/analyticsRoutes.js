const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting and auth/admin middleware to all routes in this router
router.use(apiLimiter);
router.use(authMiddleware);
router.use(authorize('admin'));

// Aggregation endpoints
router.get('/overview', adminController.getOverviewStats);
router.get('/revenue', adminController.getRevenueAnalytics);
router.get('/routes', adminController.getRouteAnalytics);
router.get('/utilization', adminController.getDriverUtilization);
router.get('/sla', adminController.getSlaStats);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/surge', adminController.getSurgePricing);
router.get('/export-bookings', adminController.exportBookings);
router.get('/platform-config', adminController.getPlatformConfig);
router.put('/platform-config', adminController.updatePlatformConfig);

module.exports = router;
