const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

// In a real app, you'd have middleware to authenticate the driver first
// router.use(authMiddleware);

router.get('/', driverController.getAllDrivers);
router.post('/', driverController.createDriver);
router.put('/:id/availability', driverController.toggleAvailability);

module.exports = router;
