const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(apiLimiter);

router.get('/', driverController.getAllDrivers);
router.post('/', driverController.createDriver);
router.put('/:id/availability', driverController.toggleAvailability);

module.exports = router;
