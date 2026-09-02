const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { apiLimiter, authLimiter } = require('../middleware/rateLimiter');

// Public route for admin login
router.post('/login', authLimiter, adminAuthController.adminLogin);

// Apply rate limiting, auth and admin middleware to all protected routes
router.use(apiLimiter);
router.use(authMiddleware);
router.use(adminMiddleware);

const { validateDriver, validateCustomer, validateVehicle } = require('../middleware/requestValidator');

// Driver routes
router.get('/drivers', adminController.getDrivers);
router.post('/drivers', validateDriver, adminController.createDriver);
router.put('/drivers/:id', validateDriver, adminController.updateDriver);
router.delete('/drivers/:id', adminController.deleteDriver);

// Customer routes
router.get('/customers', adminController.getCustomers);
router.post('/customers', validateCustomer, adminController.createCustomer);
router.put('/customers/:id', validateCustomer, adminController.updateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);

// Vehicle routes
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', validateVehicle, adminController.createVehicle);
router.put('/vehicles/:id', validateVehicle, adminController.updateVehicle);
router.delete('/vehicles/:id', adminController.deleteVehicle);

module.exports = router;
