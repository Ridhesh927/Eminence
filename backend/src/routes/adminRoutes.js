const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter, authLimiter, adminReportsLimiter } = require('../middleware/rateLimiter');

// Public route for admin login
router.post('/login', authLimiter, adminAuthController.adminLogin);

// Apply rate limiting, auth, and admin role verification to all protected routes
router.use(apiLimiter);
router.use(authMiddleware);
router.use(authorize('admin'));

// Register Admin Device Push Token (for background/offline SOS buzz notifications)
router.post('/push-token', adminAuthController.registerPushToken);

const { validateDriver, validateCustomer, validateVehicle } = require('../middleware/requestValidator');

// Driver routes
router.get('/drivers', adminController.getDrivers);
router.post('/drivers', validateDriver, adminController.createDriver);
router.put('/drivers/:id', validateDriver, adminController.updateDriver);
router.delete('/drivers/:id', adminController.deleteDriver);
router.post('/drivers/bulk-delete', adminController.bulkDeleteDrivers);

// Customer routes
router.get('/customers', adminController.getCustomers);
router.post('/customers', validateCustomer, adminController.createCustomer);
router.put('/customers/:id', validateCustomer, adminController.updateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);
router.post('/customers/bulk-delete', adminController.bulkDeleteCustomers);

// Vehicle routes
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', validateVehicle, adminController.createVehicle);
router.put('/vehicles/:id', validateVehicle, adminController.updateVehicle);
router.delete('/vehicles/:id', adminController.deleteVehicle);

// Analytics routes (expensive report queries protected with adminReportsLimiter)
router.get('/stats/overview', adminReportsLimiter, adminController.getOverviewStats);
router.get('/stats/revenue', adminReportsLimiter, adminController.getRevenueAnalytics);
router.get('/stats/routes', adminReportsLimiter, adminController.getRouteAnalytics);

// Contracts routes
router.get('/contracts', adminController.getContracts);
router.put('/contracts/:id', adminController.updateContractStatus);

// Promo Code / Referral CRUD routes
router.get('/promocodes', adminController.getPromoCodes);
router.post('/promocodes', adminController.createPromoCode);
router.put('/promocodes/:id', adminController.updatePromoCode);
router.delete('/promocodes/:id', adminController.deletePromoCode);

// Admin Management routes
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.post('/admins/bulk-delete', adminController.bulkDeleteAdmins);

module.exports = router;
