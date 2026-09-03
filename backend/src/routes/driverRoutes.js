const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { getSurgeHeatmap } = require('../services/aiForecasting');
const protect = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

// Add heatmap route
router.get('/heatmap', (req, res) => {
  try {
    const data = getSurgeHeatmap();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching heatmap' });
  }
});

// Mock inventory scanning route for WMS
router.post('/scan-inventory', async (req, res) => {
  try {
    const { barcode } = req.body;
    // In a real scenario we'd query the DB:
    // const item = await Inventory.findOne({ where: { barcode }});
    // if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    // await item.update({ status: 'Loaded' });

    res.status(200).json({ 
      success: true, 
      message: 'Item scanned successfully',
      item: {
        barcode,
        itemName: 'Simulated Cargo Box',
        status: 'Loaded'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error scanning barcode' });
  }
});
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(apiLimiter);

router.get('/', driverController.getAllDrivers);
router.post('/', driverController.createDriver);
router.patch('/:id/toggle', driverController.toggleAvailability);
router.get('/:id/payslip', protect, driverController.generatePayslip);

module.exports = router;
