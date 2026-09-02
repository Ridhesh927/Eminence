const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Apply auth and admin middleware to all routes in this router
router.use(authMiddleware);
router.use(adminMiddleware);

// Driver routes
router.get('/drivers', adminController.getDrivers);
router.post('/drivers', adminController.createDriver);
router.put('/drivers/:id', adminController.updateDriver);
router.delete('/drivers/:id', adminController.deleteDriver);

// Customer routes
router.get('/customers', adminController.getCustomers);
router.post('/customers', adminController.createCustomer);
router.put('/customers/:id', adminController.updateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);

// Vehicle routes
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', adminController.createVehicle);
router.put('/vehicles/:id', adminController.updateVehicle);
router.delete('/vehicles/:id', adminController.deleteVehicle);
=======
const adminAuthController = require('../controllers/adminAuthController');

// Public route for admin login
router.post('/login', adminAuthController.adminLogin);
>>>>>>> dd2921aa53649c5bee49cc42dece61627f6f1c0b

module.exports = router;
